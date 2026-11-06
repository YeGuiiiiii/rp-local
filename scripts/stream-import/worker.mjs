import { BackupStreamDecoder } from './decoder.mjs';
import { database, StagingSink, saveSession, validate } from './storage.mjs';

let paused = false, resume, running = false;
const wait = async () => { while (paused) await new Promise(resolve => { resume = resolve; }); };
self.onmessage = async ({ data }) => {
    if (data.type === 'pause') { paused = true; return; }
    if (data.type === 'resume') { paused = false; resume?.(); return; }
    if (data.type !== 'import' || running) return;
    running = true;
    const session = { id: data.id, name: data.file.name, state: 'reading', bytes: data.file.size, read: 0 };
    let db, timer, lastNotice = 0, phase = '分块读取与校验';
    const progress = nextPhase => {
        if (nextPhase) phase = nextPhase;
        if (performance.now() - lastNotice < 200 && !nextPhase) return;
        lastNotice = performance.now();
        postMessage({ type: 'progress', read: session.read, phase });
    };
    const heartbeat = setInterval(() => progress(), 1000);
    try {
        db = await database();
        await saveSession(db, session);
        const sink = new StagingSink(db, session.id);
        const parser = new BackupStreamDecoder({ emit: item => sink.emit(item) });
        for (let offset = 0; offset < session.bytes; offset += 65536) {
            await wait();
            const buffer = await Promise.race([
                data.file.slice(offset, offset + 65536).arrayBuffer(),
                new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('读取文件超时，请将备份保存到设备本地后重试')), 30000); }),
            ]).finally(() => clearTimeout(timer));
            parser.write(new Uint8Array(buffer));
            await sink.flush();
            session.read = offset + buffer.byteLength;
            progress();
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        const parsed = parser.end();
        await sink.flush();
        progress('核对角色卡、聊天与记忆');
        Object.assign(session, await validate(db, session.id, parsed.source, wait), { source: parsed.source, state: 'complete' });
        await saveSession(db, session);
        postMessage({ type: 'complete', summary: session.summary });
    } catch (error) {
        postMessage({ type: 'failed', message: error.name === 'QuotaExceededError' ? '设备存储空间不足，原数据未改动' : error.message });
    } finally {
        clearInterval(heartbeat);
        db?.close();
        running = false;
    }
};
postMessage({ type: 'ready' });
