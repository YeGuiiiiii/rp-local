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
    const limits = profile(data.profile);
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
            let file = data.file;
            if (!file) {
                const response = await readWithTimeout(fetch(data.url, { cache: 'no-store' }));
                if (!response.ok) throw new Error('读取本地备份失败，请重新选择文件');
                session.bytes = Number(response.headers.get('content-length')) || session.bytes;
                const reader = response.body?.getReader?.();
                if (reader) {
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
                file = await readWithTimeout(response.blob());
                session.bytes = file.size;
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
        postMessage({ type: 'complete', summary: session.summary, bytes: session.read });
    } catch (error) {
        postMessage({ type: 'failed', message: error.name === 'QuotaExceededError' ? '设备存储空间不足，原数据未改动' : error.message });
    } finally {
        clearInterval(heartbeat);
        db?.close();
        running = false;
    }
};
postMessage({ type: 'ready' });
