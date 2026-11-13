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
// [rphub 2.9.036] 旧版快照是「一个 164MB 的嵌套对象」。2.9.034 的跳过只在 value 的 token
//   产出后才丢弃，tokenizer 仍会把里面每个 token 走一遍 —— 实测 0~163.9MB 区间零产出，
//   手机端就卡在这一段。这里改成在喂 tokenizer 之前按字节整段跳过，只补一个 null 占位。
const legacyEntryPrefix = new TextEncoder().encode('{"key":"');
const legacyKeyPrefix = new TextEncoder().encode('rp_hub_auto_backup_');
// auto_backup_config 是当前仍在用的配置，不能跟其它旧快照一起跳过。
const keptBackupKey = new TextEncoder().encode('rp_hub_auto_backup_config');
// [rphub 2.9.039] localStorage 区里的旧快照要按字节跳过，先认键名。两条前缀都是「旧版导出端」
//   会写进 localStorage 的原生键名（现代键名与 silly_tavern_ 老键名）。
const localStorageNeedles = [
    new TextEncoder().encode('"rp_hub_auto_backup_'),
    new TextEncoder().encode('"silly_tavern_auto_backup_'),
];
const isSpaceByte = c => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
const NULL_BYTES = Uint8Array.from([0x6e, 0x75, 0x6c, 0x6c]);
const nextStructuralCodes = [0x7b, 0x7d, 0x5b, 0x5d];
const trailingBackslashes = bytes => {
    let count = 0;
    for (let k = bytes.length - 1; k >= 0 && bytes[k] === BACKSLASH; k--) count++;
    return count;
};
const QUOTE = 0x22, BACKSLASH = 0x5c;
// [rphub 2.9.042] 从 from 起读一个 JSON 字符串的**内部**，返回未转义的结束引号位置。
//   原先一律用 indexOf(QUOTE) 找结尾 —— 键名里带转义引号时（实测
//   rw-field-checkpoint-v1:["efe9...","main",...] 这种把 JSON put 当键名的写法）会在
//   \" 处提前收尾，键名被截成 rw-field-checkpoint-v1:[\ 这一小段。按截断的键名去判
//   「该不该跳过」，用户勾选的这几条偏好就永远导不进来。返回 -1 表示键被切在块尾。
const scanStringEnd = (bytes, from) => {
    for (let i = from; i < bytes.length; i++) {
        const c = bytes[i];
        if (c === BACKSLASH) { i++; continue; }
        if (c === QUOTE) return i;
    }
    return -1;
};
// 字节里拿到的是转义形式，必须还原成真实键名才能和 pick（解码后的键）对上。
const decodeKeyBytes = (bytes, start, end) => {
    const raw = new TextDecoder().decode(bytes.subarray(start, end));
    if (raw.indexOf('\\') < 0) return raw;
    try { return JSON.parse('"' + raw + '"'); } catch (_) { return raw; }
};
const equalsAt = (hay, at, needle) => {
    if (at + needle.length > hay.length) return false;
    for (let j = 0; j < needle.length; j++) if (hay[at + j] !== needle[j]) return false;
    return true;
};
const indexOfBytes = (hay, needle, from) => {
    const first = needle[0];
    let at = hay.indexOf(first, Math.max(0, from));
    while (at >= 0) {
        if (equalsAt(hay, at, needle)) return at;
        at = hay.indexOf(first, at + 1);
    }
    return -1;
};
const scalarTokens = new Set([TokenType.STRING, TokenType.NUMBER, TokenType.TRUE, TokenType.FALSE, TokenType.NULL]);
const openTokens = new Set([TokenType.LEFT_BRACE, TokenType.LEFT_BRACKET]);
const closeTokens = new Set([TokenType.RIGHT_BRACE, TokenType.RIGHT_BRACKET]);
const utf8 = new TextEncoder();
// [rphub 2.9.040] 只量长度、不分配。原先量一个 100MB 的字符串要 stringify 出一份、
//   再 encode 出一份 Uint8Array，两份都是立刻作废的垃圾，手机端的 GC 就死在这里。
//   这里直接按 UTF-16 码元算 UTF-8 字节数（代理对两个码元各记 2 字节，合计 4）。
//   转义字符不单独展开：只用于体积分档与单条上限判定，不参与数据本身。
const ASCII_RUN = /^[\x00-\x7f]*$/;
const stringByteLength = value => {
    const length = value.length;
    if (length > 4096 && ASCII_RUN.test(value)) return length + 2;
    let bytes = 2;
    for (let i = 0; i < length; i++) {
        const code = value.charCodeAt(i);
        bytes += code < 0x80 ? 1
            : code < 0x800 ? 2
                : (code >= 0xd800 && code <= 0xdfff) ? 2 : 3;
    }
    return bytes;
};

export class BackupStreamDecoder {
    constructor(options = {}) {
        const { emit, maxUnitBytes = 32 * 1024 * 1024 } = options;
        this.emit = typeof emit === 'function' ? emit : () => {};
        // [rphub 2.9.040] 分批导入：只暂存 pick 里的键，其余按字节整段跳过（和旧快照同一套机制）。
        //   survey 模式一个都不暂存，只把每项的字节数统计出来，给用户一份「导入内容清单」。
        this.pick = options && Array.isArray(options.pick) && options.pick.length ? new Set(options.pick) : null;
        this.survey = !!(options && options.survey);
        this.stringSkip = null;
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
        // [rphub 2.9.042] 清点那一趟顺手把每条在文件里的字节区间记下来。导入时只读勾选的
        //   那几条，不再把整个文件重读一遍 —— 同一个页面里连读两遍几百兆，手机端的渲染
        //   进程扛不住，这是「进度 100% 之后整页被杀」的真正原因。
        this.spans = [];
        this.entrySkips = 0;
        this.entriesOpen = -1;
        this.entriesClose = -1;
        // [rphub 2.9.038] 正在「只吞不建」的旧快照；见 mute()
        this.muted = null;
        this.pendingSkip = null;
        // [rphub 2.9.036] 字节级跳过状态；offsetAdjust 把 tokenizer 偏移修回真实文件偏移
        this.skipState = null;
        this.offsetAdjust = 0;
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
        const active = { path, parser, start: info.offset + this.offsetAdjust, accept };
        this.active = active;
        parser.onValue = ({ value, stack }) => {
            if (stack.length) return;
            // [rphub 2.9.038] 先按 UTF-16 长度判一次：任何字符串的 UTF-8 字节数都 ≥ 它的
            //   UTF-16 长度，所以这里判超就一定有超。原先是先 stringify + encode 再判 ——
            //   一个上百 MB 的旧快照要走完三次拷贝才被拒，手机端在拒绝之前就已经撑死了。
            if (typeof value === 'string' && value.length > this.maxUnitBytes)
                throw this.failure('单条记录超过 ' + this.maxUnitBytes / 1048576 + ' MB，请切换读取档位；原数据未改动', path);
            const bytes = typeof value === 'string'
                ? stringByteLength(value)
                : utf8.encode(JSON.stringify(value)).length;
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
            // [rphub 2.9.042] 记下 '[' 之后第一个字节的位置：按区间重读时，头部就截到这里。
            this.entriesOpen = info.offset + this.offsetAdjust + 1;
        }
        const location = this.locate(path);
        if (location) {
            const relative = location.relative;
            // [rphub 2.9.036] 被字节级跳过的条目替换成 null 占位，数组下标保持不变，直接放过。
            if (!relative.length && token === TokenType.NULL) return;
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
                if (this.shouldSkipKey(record.key)) {
                    record.skipped = true;
                    record.count = 0;
                    record.skipStart = typeof info.offset === 'number' ? info.offset + this.offsetAdjust : this.bytes;
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
            // NULL 是我们自己补的占位（键名照喂、值已按字节吞掉），别再当成新的一条记一次。
            if (this.shouldSkipKey(path[2])) { if (token !== TokenType.NULL) this.mute(info, path[2]); return; }
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

    // [rphub 2.9.038] 旧版自动备份快照还有第二个落脚点：webStorage.localStorage。
    //   导出端（app.js 的 collectLocalStorageDump）把整份 localStorage 原样写进这里，
    //   旧快照就是一条上百 MB 的字符串值。entries 里的旧快照 2.9.034/036 已经按字节跳过，
    //   但这条路径压根没走 shouldSkipEntryKey —— 整份旧包会被 TokenParser 组装出来，
    //   再 stringify + utf8 编码各复制一份，三份同时活着。带旧备份的外来包就是死在这里。
    //   这里只吞 token、不构造值：validator 照常校验结构，其余一概不落地。
    mute(info, key) {
        this.muted = { depth: 0, opened: false, key: String(key || ''), start: info.offset + this.offsetAdjust };
    }
    trackMuted(info) {
        const state = this.muted;
        const token = info.token;
        if (openTokens.has(token)) { state.depth++; state.opened = true; return; }
        if (closeTokens.has(token)) {
            state.depth--;
            if (state.opened && state.depth === 0) this.endMute();
            return;
        }
        // 大字符串是按 64KB 分片吐的（partial），别在第一片就收工。
        if (!state.opened && state.depth === 0 && scalarTokens.has(token) && !info.partial) this.endMute();
    }
    endMute() {
        // 大字符串是整条吐出来的（实测 5MB 也只有一个 token），token 的 offset 是它的**起点**，
        //   所以真实的结尾要等下一个 token 才知道。这里先挂起，下一个 token 进来再结算。
        this.pendingSkip = { key: this.muted.key, start: this.muted.start };
        this.muted = null;
    }
    settleSkip() {
        if (!this.pendingSkip) return;
        const item = this.pendingSkip;
        this.pendingSkip = null;
        this.skippedEntries.push({ key: item.key, bytes: Math.max(0, this.lastToken - item.start) });
    }

    token(info) {
        const frame = this.frames.at(-1);
        const token = info.token;
        const keyToken = frame?.kind === 'object' && frame.expectKey && token === TokenType.STRING;
        if (keyToken && ['__proto__', 'constructor', 'prototype'].includes(info.value)) {
            throw this.failure('备份包含不安全的对象属性名：' + info.value);
        }
        this.validator.write(info);
        this.lastToken = info.offset + this.offsetAdjust;
        this.settleSkip();
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
        } else if (!wasActive && !this.muted && !closeTokens.has(token)) this.route(this.currentPath(), info);

        if (openTokens.has(token)) {
            const path = this.currentPath();
            if (!this.frames.length && token !== TokenType.LEFT_BRACE) throw this.failure('备份根节点必须是对象', path);
            if (this.frames.length >= this.depthLimit) throw this.failure('备份嵌套层级过深', path);
            this.frames.push({ path, kind: token === TokenType.LEFT_BRACE ? 'object' : 'array', index: 0, key: undefined, expectKey: true });
        } else if (closeTokens.has(token)) {
            const closed = this.frames.pop();
            // entries 数组的 ']' 就是「条目区结束、尾巴开始」的分界点：尾巴里是
            //   databases 与 webStorage，体积很小，整段照读即可。
            if (closed && closed.kind === 'array' && closed.path.length === 1 && closed.path[0] === 'entries')
                this.entriesClose = info.offset + this.offsetAdjust;
            const location = this.locate(closed.path);
            // 偏移必须和 skipStart 用同一套口径（都加 offsetAdjust），否则字节级跳过之后
            //   这里算出来的体积会变成 0 甚至负数。
            if (location && !location.relative.length) this.completeRecord(location, info.offset + this.offsetAdjust);
            if (location?.mapKey && location.relative.length === 1 && location.relative[0] === 'value'
                && closed.kind === 'array') this.completeRecord(location, info.offset + this.offsetAdjust);
            if (!this.frames.length) this.rootClosed = true;
        }
        if (this.muted) this.trackMuted(info);
    }

    // [rphub 2.9.036] 分片喂 tokenizer：遇到旧版快照条目就在这里把整段字节吞掉，
    //   只补一个 null 占位。整段不产生任何 token，也不会长出一个 164MB 的对象。
    feedSlice(bytes, start, end) {
        if (end <= start) return;
        const text = this.textDecoder.decode(bytes.subarray(start, end), { stream: true });
        if (text) this.tokenizer.write(text);
    }

    atEntriesElement() {
        // frames[0] 是根对象，frames[1] 才是 entries 数组；元素起点时长度正好是 2。
        const frames = this.frames;
        const array = frames[1];
        return frames.length === 2 && array.kind === 'array'
            && array.path.length === 1 && array.path[0] === 'entries';
    }

    legacyKeyAt(bytes, hit) {
        const start = hit + legacyEntryPrefix.length;
        const stop = Math.min(bytes.length, start + 512);
        const end = scanStringEnd(bytes.subarray(0, stop), start);
        if (end < 0) return '';
        return decodeKeyBytes(bytes, start, end);
    }

    // 从条目对象的 '{' 起按字节找配对的 '}'，全程不构造字符串。
    // 下一个结构字节：引号 / 花括号 / 方括号，取最早的一个。全部走原生 indexOf。
    nextStructural(bytes, from) {
        let next = bytes.indexOf(QUOTE, from);
        if (next < 0) next = bytes.length;
        for (const code of (nextStructuralCodes)) {
            const at = bytes.indexOf(code, from);
            if (at >= 0 && at < next) next = at;
        }
        return next;
    }

    // [rphub 2.9.039] 导出端把整份 localStorage 原样写进 webStorage.localStorage，旧快照就是那里的
    //   一个「值是一整份旧包」的字符串成员。这条分支原先只有 mute（不构造值），可 tokenizer 会把
    //   大字符串整条建出来（实测 5MB 也只有一个 token），那一次分配躲不掉。所以改成和 entries
    //   一样：喂 tokenizer 之前按字节整段吞掉，只补 null 占位。
    inLocalStorageContainer() {
        const frames = this.frames;
        if (frames.length !== 3) return false;
        const local = frames[2];
        return local.kind === 'object' && local.path.length === 2
            && local.path[0] === 'webStorage' && local.path[1] === 'localStorage';
    }

    findLocalStorageSkip(bytes, from) {
        for (const needle of localStorageNeedles) {
            let at = indexOfBytes(bytes, needle, from);
            while (at >= 0) {
                let i = at - 1;
                while (i >= 0 && isSpaceByte(bytes[i])) i--;
                // 键位判定：前面必须是 { 或 ,
                if (i < 0 || (bytes[i] !== 0x7b && bytes[i] !== 0x2c)) { at = indexOfBytes(bytes, needle, at + 1); continue; }
                const keyStart = at + 1;
                const keyEnd = scanStringEnd(bytes, keyStart);
                if (keyEnd < 0) return null; // 键被切在块尾，下一块再说
                let j = keyEnd + 1;
                while (j < bytes.length && isSpaceByte(bytes[j])) j++;
                if (bytes[j] !== 0x3a) { at = indexOfBytes(bytes, needle, at + 1); continue; } // 不是键，是普通字符串
                j++;
                while (j < bytes.length && isSpaceByte(bytes[j])) j++;
                if (bytes[j] !== QUOTE) { at = indexOfBytes(bytes, needle, at + 1); continue; } // 值不是字符串，交给 mute
                const key = decodeKeyBytes(bytes, keyStart, keyEnd);
                if (!this.shouldSkipKey(key)) { at = indexOfBytes(bytes, needle, at + 1); continue; }
                return { hit: at, key, valueStart: j };
            }
        }
        return null;
    }

    // 该不该整段跳过：旧快照永远跳；auto_backup_config 永远留；
    //   survey 全跳（只清点体积）；有 pick 时未选中的也跳。
    shouldSkipKey(key) {
        const raw = String(key || '');
        if (shouldSkipEntryKey(raw)) return true;
        if (this.survey) return true;
        if (!this.pick) return false;
        const logical = modernKey(raw);
        if (logical === 'rp_hub_auto_backup_config') return false;
        // [rphub 2.9.042] 勾选清单里的键是文件里的原样键名，比对时两种形态都要认：
        //   只按归一化后的 rp_hub_ 形态比对，老包里的 silly_tavern_* 键就会「勾了也导不进来」。
        return !(this.pick.has(raw) || this.pick.has(logical));
    }

    skipLegacyString(bytes, from) {
        const state = this.stringSkip;
        const total = bytes.length;
        let i = state.started ? from : from + 1; // 首块跳过开引号
        state.started = true;
        while (i < total) {
            const q = bytes.indexOf(QUOTE, i);
            if (q < 0) {
                state.tail = trailingBackslashes(bytes);
                return total;
            }
            let backslashes = 0;
            for (let k = q - 1; k >= 0 && bytes[k] === BACKSLASH; k--) backslashes++;
            if (q === backslashes) backslashes += state.tail;
            state.tail = 0;
            i = q + 1;
            if ((backslashes & 1) === 0) {
                const skipped = this.bytes + q + 1 - state.start;
                this.skippedEntries.push({ key: state.key, bytes: skipped });
                this.offsetAdjust += skipped - 4;
                this.stringSkip = null;
                this.feedSlice(NULL_BYTES, 0, 4);
                return i;
            }
        }
        return total;
    }

    skipLegacyEntry(bytes, from) {
        const state = this.skipState;
        const total = bytes.length;
        let i = from;
        while (i < total) {
            if (state.inStr) {
                const q = bytes.indexOf(QUOTE, i);
                if (q < 0) {
                    state.tail = trailingBackslashes(bytes);
                    return total;
                }
                let backslashes = 0;
                for (let k = q - 1; k >= 0 && bytes[k] === BACKSLASH; k--) backslashes++;
                // 反斜杠串被切块时，前半段在上一块里，必须补上，否则会把 \" 误判成串结束
                if (q === backslashes) backslashes += state.tail;
                state.tail = 0;
                i = q + 1;
                if ((backslashes & 1) === 0) state.inStr = false;
                continue;
            }
            const c = bytes[i];
            if (c === QUOTE) { state.inStr = true; i++; continue; }
            if (c === 0x7b || c === 0x5b) { state.depth++; i++; continue; }
            if (c === 0x7d || c === 0x5d) {
                state.depth--;
                i++;
                if (state.depth === 0) {
                    const end = this.bytes + i;
                    const skipped = end - state.start;
                    if (this.survey) {
                        this.spans.push({ key: state.key, start: state.start, end });
                        this.entrySkips += 1;
                    }
                    this.skippedEntries.push({ key: state.key, bytes: skipped });
                    this.offsetAdjust += skipped - 4;
                    this.skipState = null;
                    this.feedSlice(NULL_BYTES, 0, 4);
                    return i;
                }
                continue;
            }
            const next = this.nextStructural(bytes, i);
            if (next >= total) {
                state.tail = 0;
                return total;
            }
            i = next;
        }
        return total;
    }

    write(bytes) {
        try {
            const total = bytes.byteLength;
            let from = 0;
            while (from < total) {
                if (this.skipState) { from = this.skipLegacyEntry(bytes, from); continue; }
                if (this.stringSkip) { from = this.skipLegacyString(bytes, from); continue; }
                // 不预设 frames：同一块里可能先结束上一条、再开始 legacy 条目。
                // 命中后喂到命中处，再用 frames 校验是否真的在 entries 元素起点。
                // [rphub 2.9.040] 有 pick 时每条都要看一眼（未选中的也要按字节跳），
                //   没有 pick 时维持老路：只认旧快照前缀。
                let hit = indexOfBytes(bytes, legacyEntryPrefix, from);
                if (!this.pick && !this.survey) {
                    while (hit >= 0) {
                        const at = hit + legacyEntryPrefix.length;
                        if (equalsAt(bytes, at, legacyKeyPrefix) && !equalsAt(bytes, at, keptBackupKey)) break;
                        hit = indexOfBytes(bytes, legacyEntryPrefix, hit + 1);
                    }
                }
                // localStorage 里的旧快照：取两种命中里更靠前的那个，别喂过头。
                //   这里不做容器判定 —— frames 只在喂过 token 之后才更新，同一块里刚进 webStorage
                //   时还看不到，判定会把整块喂过去、白白把大字符串建出来。键位判定（前面是 { 或 ,
                //   后面紧跟冒号与字符串）已经足够窄，且 entries 那种 {"key":...} 形态前一个字节是
                //   冒号，不会被这里误吃。
                const local = this.findLocalStorageSkip(bytes, from);
                if (local && (hit < 0 || local.hit < hit)) {
                    // 键名与冒号必须照常喂进去，只把「值」换成 null 占位。
                    this.feedSlice(bytes, from, local.valueStart);
                    this.stringSkip = { key: local.key, start: this.bytes + local.valueStart, tail: 0, started: false };
                    from = this.skipLegacyString(bytes, local.valueStart);
                    continue;
                }
                if (hit < 0) { this.feedSlice(bytes, from, total); break; }
                this.feedSlice(bytes, from, hit);
                if (!this.atEntriesElement()) { this.feedSlice(bytes, hit, hit + 1); from = hit + 1; continue; }
                // 键名被切在块尾时 legacyKeyAt 只能给出空串 —— 这种情况绝不跳过，宁可让
                //   这一条正常导进去，也不能因为认不出键名就把它吞了（那是丢数据）。
                const entryKey = this.legacyKeyAt(bytes, hit);
                if (!entryKey || !this.shouldSkipKey(entryKey)) {
                    // 要留的条目：只把开头那个 { 喂进去，值交给正常的 token 流程。
                    this.feedSlice(bytes, hit, hit + 1);
                    from = hit + 1;
                    continue;
                }
                this.skipState = { depth: 0, inStr: false, tail: 0, start: this.bytes + hit, key: entryKey };
                from = this.skipLegacyEntry(bytes, hit);
            }
            this.bytes += total;
            // 字节级跳过期间不产生 token，lastToken 会落后 100 多 MB；此时以当前读到的
            // 真实位置计，避免把「被跳过的区间」误判成单条超限。
            const earliest = this.active?.start ?? ((this.skipState || this.stringSkip) ? this.bytes : this.lastToken);
            if (this.bytes - earliest > this.maxUnitBytes + total) {
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
        this.settleSkip();
        try {
            const tail = this.textDecoder.decode();
            if (tail) this.tokenizer.write(tail);
            if (!this.tokenizer.isEnded) this.tokenizer.end();
        } catch (_) { throw this.failure('文件结尾不完整，原数据未改动'); }
        if (!this.rootClosed || this.active || this.records.size || this.skipState || this.muted || this.stringSkip)
            throw this.failure('备份不完整，不能启用');
        if (this.metadata.type !== 'rp-hub-complete-backup' && !this.metadata.__rphub_backup__
            && !Object.keys(this.entryCounts).some(key => key.startsWith('database:'))) {
            throw this.failure('未识别为 RP-Hub 全量备份');
        }
        const source = this.sawEntries ? 'entries' : ['database:RPHubDB', 'database:main', 'database:SillyTavernDB']
            .find(key => this.entryCounts[key] > 0);
        // 清单模式下一条都没暂存是正常结果，不是错误。
        if ((!source || !this.entryCounts[source]) && !this.survey && !this.pick)
            throw this.failure('备份没有可用的主库条目');
        // [rphub 2.9.040] 按存储键把跳过的字节数汇总成清单，交给界面做勾选列表。
        const grouped = new Map();
        for (const item of this.skippedEntries) {
            const key = String(item.key || '');
            if (!key) continue;
            const row = grouped.get(key) || { key, bytes: 0, count: 0 };
            row.bytes += Math.max(0, Number(item.bytes) || 0);
            row.count += 1;
            grouped.set(key, row);
        }
        const items = [...grouped.values()].sort((a, b) => b.bytes - a.bytes);
        // [rphub 2.9.042] 按区间导的资格：区间必须严丝合缝铺满整个 entries 数组 ——
        //   首段正好从 '[' 之后起、末段正好顶到 ']'、中间每两段之间只隔一个字节（逗号）。
        //   任何一处不符就退回整读，宁可慢一趟，也不能凭错位的区间拼出一个假备份。
        let contiguous = this.survey && this.spans.length > 0;
        if (contiguous && this.entriesOpen >= 0 && this.entriesClose >= 0) {
            contiguous = this.spans[0].start === this.entriesOpen
                && this.spans[this.spans.length - 1].end === this.entriesClose;
            for (let i = 1; contiguous && i < this.spans.length; i++)
                if (this.spans[i].start - this.spans[i - 1].end !== 1) contiguous = false;
        } else contiguous = false;
        return {
            source, metadata: this.metadata, counts: this.entryCounts, maxUnitBytes: this.maxUnit,
            skipped: this.skippedEntries, items,
            spans: contiguous ? this.spans : [], entriesOpen: this.entriesOpen,
            entriesClose: this.entriesClose, indexed: contiguous,
        };
    }
}
