import { BackupStreamDecoder } from './decoder.mjs';
import { database, StagingSink, saveSession, validate } from './storage.mjs';
import { profile } from './profiles.mjs';

let paused = false, resume, running = false;
const wait = async () => { while (paused) await new Promise(resolve => { resume = resolve; }); };
self.onmessage = async ({ data }) => {
    if (data.type === 'pause') { paused = true; return; }
    if (data.type === 'resume') { paused = false; resume?.(); return; }
    if (data.type !== 'import' || running) return;
    running = true;
    // [rphub 2.9.035] 主线程按本机堆实测下发 limits：单条上限最高 128MB，分块大小随
    //   设备能力自适应。缺失时退回档位默认值，行为与旧版一致。
    const MB = 1048576;
    const UNIT_CAP = 128 * MB;
    const base = profile(data.profile);
    const asked = data.limits || {};
    const limits = {
        ...base,
        unitBytes: Math.min(UNIT_CAP, Math.max(base.unitBytes, Number(asked.unitBytes) || 0)),
        chunkBytes: Math.max(base.chunkBytes, Math.min(4 * MB, Number(asked.chunkBytes) || 0)),
        collectionBytes: Math.max(base.collectionBytes, Number(asked.collectionBytes) || 0),
    };
    const session = { id: data.id, name: data.file?.name || data.name, state: 'reading', bytes: data.file?.size || data.bytes || 0, read: 0 };
    let db, timer, lastNotice = 0, phase = '分块读取与校验';
    const progress = nextPhase => {
        if (nextPhase) phase = nextPhase;
        if (performance.now() - lastNotice < 200 && !nextPhase) return;
        lastNotice = performance.now();
        postMessage({ type: 'progress', read: session.read, bytes: session.bytes, phase });
    };
    const heartbeat = setInterval(() => progress(), 1000);
    const readWithTimeout = promise => Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('读取文件超时，请将备份保存到设备本地后重试')), 30000);
    })]).finally(() => clearTimeout(timer));
    try {
        db = await database();
        await saveSession(db, session);
        const sink = new StagingSink(db, session.id);
        const parser = new BackupStreamDecoder({ emit: item => sink.emit(item), maxUnitBytes: limits.unitBytes });
        const chunks = async function* () {
            const file = data.file;
            if (data.stream) {
                const reader = data.stream.getReader();
                try {
                    for (;;) {
                        await wait();
                        const item = await readWithTimeout(reader.read());
                        if (item.done) break;
                        yield item.value;
                    }
                } finally { await reader.cancel().catch(() => {}); }
                return;
            }
            for (let offset = 0; offset < file.size; offset += limits.chunkBytes) {
                await wait();
                yield new Uint8Array(await readWithTimeout(file.slice(offset, offset + limits.chunkBytes).arrayBuffer()));
            }
        };
        let pendingBytes = 0;
        for await (const buffer of chunks()) {
            await wait();
            parser.write(buffer);
            pendingBytes += buffer.byteLength;
            if (pendingBytes >= limits.chunkBytes) {
                await sink.flush(); pendingBytes = 0;
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            session.read += buffer.byteLength;
            progress();
        }
        const parsed = parser.end();
        await sink.flush();
        progress('核对角色卡、聊天与记忆');
        Object.assign(session, await validate(db, session.id, parsed.source, wait, limits.collectionBytes), { source: parsed.source, state: 'complete' });
        await saveSession(db, session);
        postMessage({ type: 'complete', summary: session.summary, bytes: session.read, skipped: parsed.skipped || [], unitLimit: limits.unitBytes });
    } catch (error) {
        // [rphub 2.9.034] 一起回传超限位置：只给一句「请切换读取档位」用户无从下手，
        //   而 path 已经能精确指到 $.entries[3].value 这种位置。
        postMessage({
            type: 'failed',
            message: error.name === 'QuotaExceededError' ? '设备存储空间不足，原数据未改动' : error.message,
            path: typeof error.path === 'string' ? error.path : '',
            offset: typeof error.offset === 'number' ? error.offset : 0,
            unitLimit: limits.unitBytes,
        });
    } finally {
        clearInterval(heartbeat);
        db?.close();
        running = false;
    }
};
postMessage({ type: 'ready' });
