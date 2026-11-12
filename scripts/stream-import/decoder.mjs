import { Tokenizer, TokenParser, TokenType, TokenizerError, TokenParserError } from '@streamparser/json';

export const modernKey = key => key.startsWith('silly_tavern_') ? 'rp_hub_' + key.slice('silly_tavern_'.length) : key;
// [rphub 2.9.034] 旧版自动备份快照：一条就是整份旧包（实测 164MB 的单一字符串），
//   当前版本既不读取也不参与还原。旧备份包里带它时整条跳过 —— 不解析、不入库、也不占内存，
//   否则必然撞单条上限，让整包都导不进来。auto_backup_config 是当前仍在用的配置，必须保留。
export const shouldSkipEntryKey = key => {
    const raw = String(key || '');
    const logical = raw.startsWith('__ls__:') ? raw.slice('__ls__:'.length) : raw;
    const modern = modernKey(logical);
    if (modern === 'rp_hub_auto_backup_config') return false;
    return modern.startsWith('rp_hub_auto_backup_');
};
const scalarTokens = new Set([TokenType.STRING, TokenType.NUMBER, TokenType.TRUE, TokenType.FALSE, TokenType.NULL]);
const openTokens = new Set([TokenType.LEFT_BRACE, TokenType.LEFT_BRACKET]);
const closeTokens = new Set([TokenType.RIGHT_BRACE, TokenType.RIGHT_BRACKET]);
const utf8 = new TextEncoder();

export class BackupStreamDecoder {
    constructor({ emit, maxUnitBytes = 32 * 1024 * 1024 } = {}) {
        this.emit = emit;
        this.maxUnitBytes = maxUnitBytes;
        this.frames = [];
        this.records = new Map();
        this.metadata = {};
        this.entryCounts = { entries: 0 };
        this.bytes = 0;
        this.lastToken = 0;
        this.depthLimit = 96;
        this.active = null;
        this.maxUnit = 0;
        this.rootClosed = false;
        this.sawEntries = false;
        // [rphub 2.9.035] 被跳过的旧版快照，导入完成后交给界面决定是否清理
        this.skippedEntries = [];
        this.tokenizer = new Tokenizer({ stringBufferSize: 64 * 1024, numberBufferSize: 128 });
        this.textDecoder = new TextDecoder('utf-8', { fatal: true });
        this.validator = new TokenParser({ paths: [], keepStack: false });
        this.tokenizer.onToken = info => this.token(info);
        this.tokenizer.onEnd = () => { if (!this.validator.isEnded) this.validator.end(); };
    }

    failure(message, path = this.currentPath()) {
        const error = new Error(message);
        error.path = '$' + path.map(item => typeof item === 'number' ? `[${item}]` : `.${String(item).slice(0, 100)}`).join('');
        error.offset = this.lastToken;
        return error;
    }

    currentPath() {
        const frame = this.frames.at(-1);
        if (!frame) return [];
        return [...frame.path, frame.kind === 'array' ? frame.index : frame.key];
    }

    locate(path) {
        if (path[0] === 'entries' && typeof path[1] === 'number') {
            return { source: 'entries', id: path[1], relative: path.slice(2) };
        }
        if (path[0] === 'databases' && ['RPHubDB', 'main', 'SillyTavernDB'].includes(path[1])) {
            const start = path[2] === 'store' ? 3 : path[1] === 'main' && typeof path[2] === 'number' ? 2 : -1;
            if (start < 0 || path.length <= start) return null;
            const id = path[start];
            if (typeof id === 'number') return { source: 'database:' + path[1], id, relative: path.slice(start + 1) };
            return { source: 'database:' + path[1], id, relative: ['value', ...path.slice(start + 1)], mapKey: id };
        }
        return null;
    }

    record(location) {
        const identity = JSON.stringify([location.source, location.id]);
        let record = this.records.get(identity);
        if (!record) {
            record = { source: location.source, entry: location.id, key: location.mapKey, hasValue: false, array: false, count: 0 };
            this.records.set(identity, record);
        }
        return record;
    }

    completeRecord(location, offset = this.lastToken) {
        const identity = JSON.stringify([location.source, location.id]);
        const record = this.records.get(identity);
        if (record && record.skipped) {
            this.skippedEntries.push({
                key: record.key,
                bytes: Math.max(0, offset - (record.skipStart || offset)),
            });
            this.records.delete(identity);
            return;
        }
        if (!record || typeof record.key !== 'string' || !record.key || !record.hasValue) {
            throw this.failure('备份条目缺少有效的存储键或 value');
        }
        record.key = record.key.startsWith('__ls__:') ? record.key : modernKey(record.key);
        this.emit({ kind: 'record', ...record });
        this.entryCounts[record.source] = (this.entryCounts[record.source] || 0) + 1;
        this.records.delete(identity);
    }

    capture(path, info, accept) {
        const parser = new TokenParser({ paths: ['$'], keepStack: true });
        const active = { path, parser, start: info.offset, accept };
        this.active = active;
        parser.onValue = ({ value, stack }) => {
            if (stack.length) return;
            const bytes = utf8.encode(JSON.stringify(value)).length;
            if (bytes > this.maxUnitBytes) throw this.failure('单条记录超过 ' + this.maxUnitBytes / 1048576 + ' MB，请切换读取档位；原数据未改动', path);
            this.maxUnit = Math.max(this.maxUnit, bytes);
            active.accept(value, bytes);
            this.active = null;
        };
        parser.write(info);
    }

    route(path, info) {
        const token = info.token;
        if (path.length === 1 && ['type', '__rphub_backup__', 'version'].includes(path[0]) && scalarTokens.has(token)) {
            this.metadata[path[0]] = info.value;
        }
        if (path.length === 1 && path[0] === 'entries') {
            if (token !== TokenType.LEFT_BRACKET) throw this.failure('entries 必须是数组', path);
            this.sawEntries = true;
        }
        const location = this.locate(path);
        if (location) {
            const relative = location.relative;
            const record = this.record(location);
            if (!relative.length) {
                if (token !== TokenType.LEFT_BRACE) throw this.failure('备份条目必须是对象', path);
                return;
            }
            if (relative.length === 1 && ['key', 'k'].includes(relative[0])) {
                if (!scalarTokens.has(token) || typeof info.value !== 'string') throw this.failure('存储键必须是字符串', path);
                record.key = info.value;
                return;
            }
            if (relative.length === 1 && ['value', 'v'].includes(relative[0])) {
                record.hasValue = true;
                record.array = token === TokenType.LEFT_BRACKET;
                if (shouldSkipEntryKey(record.key)) {
                    record.skipped = true;
                    record.count = 0;
                    record.skipStart = typeof info.offset === 'number' ? info.offset : this.bytes;
                    return;
                }
                if (!record.array) {
                    this.capture(path, info, (value, bytes) => {
                        this.emit({ kind: 'unit', source: record.source, entry: record.entry, part: 0, value, bytes });
                        record.count = 1;
                        if (location.mapKey) this.completeRecord(location);
                    });
                }
                return;
            }
            if (relative.length === 2 && ['value', 'v'].includes(relative[0]) && typeof relative[1] === 'number' && record.array) {
                if (record.skipped) return;
                this.capture(path, info, (value, bytes) => {
                    this.emit({ kind: 'unit', source: record.source, entry: record.entry, part: relative[1], value, bytes });
                    record.count++;
                });
                return;
            }
        }
        if (path.length === 3 && path[0] === 'webStorage' && path[1] === 'localStorage') {
            this.capture(path, info, (value, bytes) => {
                this.emit({ kind: 'localStorage', key: path[2], value, bytes });
            });
        }
        // Keep companion records separate until the complete backup has passed validation.
        if (path.length === 4 && path[0] === 'databases' && !['RPHubDB', 'main', 'SillyTavernDB'].includes(path[1])) {
            this.capture(path, info, (value, bytes) => {
                this.emit({ kind: 'companion', database: path[1], store: path[2], part: path[3], value, bytes });
            });
        }
    }

    token(info) {
        const frame = this.frames.at(-1);
        const token = info.token;
        const keyToken = frame?.kind === 'object' && frame.expectKey && token === TokenType.STRING;
        if (keyToken && ['__proto__', 'constructor', 'prototype'].includes(info.value)) {
            throw this.failure('备份包含不安全的对象属性名：' + info.value);
        }
        this.validator.write(info);
        this.lastToken = info.offset;
        const wasActive = !!this.active;
        if (wasActive) this.active.parser.write(info);
        if (keyToken) {
            frame.key = info.value;
            frame.expectKey = false;
            return;
        } else if (token === TokenType.COLON) return;
        else if (token === TokenType.COMMA) {
            if (frame.kind === 'array') frame.index++;
            else frame.expectKey = true;
            return;
        } else if (!wasActive && !closeTokens.has(token)) this.route(this.currentPath(), info);

        if (openTokens.has(token)) {
            const path = this.currentPath();
            if (!this.frames.length && token !== TokenType.LEFT_BRACE) throw this.failure('备份根节点必须是对象', path);
            if (this.frames.length >= this.depthLimit) throw this.failure('备份嵌套层级过深', path);
            this.frames.push({ path, kind: token === TokenType.LEFT_BRACE ? 'object' : 'array', index: 0, key: undefined, expectKey: true });
        } else if (closeTokens.has(token)) {
            const closed = this.frames.pop();
            const location = this.locate(closed.path);
            if (location && !location.relative.length) this.completeRecord(location, info.offset);
            if (location?.mapKey && location.relative.length === 1 && location.relative[0] === 'value'
                && closed.kind === 'array') this.completeRecord(location, info.offset);
            if (!this.frames.length) this.rootClosed = true;
        }
    }

    write(bytes) {
        try {
            const text = this.textDecoder.decode(bytes, { stream: true });
            if (text) this.tokenizer.write(text);
            this.bytes += bytes.byteLength;
            const earliest = this.active?.start ?? this.lastToken;
            if (this.bytes - earliest > this.maxUnitBytes + bytes.byteLength) {
                throw this.failure('当前字符串或单条记录超过 ' + this.maxUnitBytes / 1048576 + ' MB，请切换读取档位');
            }
        } catch (error) {
            if (error instanceof TokenizerError || error instanceof TokenParserError) {
                error.message = 'JSON 语法错误，文件可能损坏或包含多余内容';
            }
            error.offset ??= this.lastToken;
            error.path ??= '$' + this.currentPath().map(part => '.' + String(part)).join('');
            throw error;
        }
    }

    end() {
        try {
            const tail = this.textDecoder.decode();
            if (tail) this.tokenizer.write(tail);
            if (!this.tokenizer.isEnded) this.tokenizer.end();
        } catch (_) { throw this.failure('文件结尾不完整，原数据未改动'); }
        if (!this.rootClosed || this.active || this.records.size) throw this.failure('备份不完整，不能启用');
        if (this.metadata.type !== 'rp-hub-complete-backup' && !this.metadata.__rphub_backup__
            && !Object.keys(this.entryCounts).some(key => key.startsWith('database:'))) {
            throw this.failure('未识别为 RP-Hub 全量备份');
        }
        const source = this.sawEntries ? 'entries' : ['database:RPHubDB', 'database:main', 'database:SillyTavernDB']
            .find(key => this.entryCounts[key] > 0);
        if (!source || !this.entryCounts[source]) throw this.failure('备份没有可用的主库条目');
        return { source, metadata: this.metadata, counts: this.entryCounts, maxUnitBytes: this.maxUnit, skipped: this.skippedEntries };
    }
}
