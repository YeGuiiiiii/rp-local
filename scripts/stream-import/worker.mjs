import { BackupStreamDecoder, shouldSkipEntryKey } from './decoder.mjs';
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
    // [rphub 2.9.040] survey = 只清点体积、一条都不落库；pick = 只暂存这些键，其余按字节跳过。
    const survey = !!data.survey;
    const pick = Array.isArray(data.pick) && data.pick.length ? data.pick.map(String) : null;
    // [rphub 2.9.042] 按字节区间读：清点那趟已经把 entries 里每条的 [start,end) 连同
    //   '[' 与 ']' 的位置一起量出来了，这一趟只读「头部 + 勾选的几条 + 尾巴」。
    //   同一个页面里把几百兆的备份连读两遍，手机端的渲染进程扛不住 —— 这一刀把第二趟
    //   从 307MB 砍到 33MB（实测）。只有在拿得到可随机读取的 File/Blob 时才能用。
    const ranges = !survey && Array.isArray(data.ranges) && data.ranges.length && data.file ? data.ranges : null;
    const rangeBytes = ranges ? ranges.reduce((sum, item) => sum + (item.end - item.start), 0) : 0;
    const session = {
        id: data.id, name: data.file?.name || data.name, state: 'reading',
        bytes: ranges ? rangeBytes : (data.file?.size || data.bytes || 0), read: 0,
    };
    let db, timer, lastNotice = 0, phase = survey ? '清点导入内容' : '分块读取与校验';
    // [rphub 2.9.041] 心跳不能空转。原先每秒无条件发一条「分块读取与校验」，主线程的看门狗
    //   每收一条就续一次命 —— 于是 worker 卡在 IndexedDB 事务里时，超时兜底永远不会响，
    //   界面表现成「进度 100%、那行小字不动、等一分钟也没反应」。现在没有变化就不发。
    let postedStamp = '';
    const progress = nextPhase => {
        if (nextPhase) phase = nextPhase;
        if (!nextPhase && performance.now() - lastNotice < 200) return;
        lastNotice = performance.now();
        const stamp = session.read + '|' + phase;
        if (!nextPhase && stamp === postedStamp) return;
        postedStamp = stamp;
        postMessage({ type: 'progress', read: session.read, bytes: session.bytes, phase });
    };
    const heartbeat = setInterval(() => progress(), 1000);
    const readWithTimeout = promise => Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('读取文件超时，请将备份保存到设备本地后重试')), 30000);
    })]).finally(() => clearTimeout(timer));
    // [rphub 2.9.041] 暂存库的写入事务一旦不回调，整趟导入就静默挂死。给它一个上限：
    //   宁可报一句能看懂的话，也不要留一个「进度 100% 什么都不动」的界面。
    const withTimeout = (promise, ms, message) => {
        let handle;
        return Promise.race([promise, new Promise((_, reject) => {
            handle = setTimeout(() => reject(new Error(message)), ms);
        })]).finally(() => clearTimeout(handle));
    };
    try {
        if (!survey) {
            db = await database();
            await saveSession(db, session);
        }
        const sink = survey ? null : new StagingSink(db, session.id);
        const parser = new BackupStreamDecoder({
            emit: sink ? item => sink.emit(item) : () => {},
            maxUnitBytes: limits.unitBytes,
            pick,
            survey,
        });
        const chunks = async function* () {
            const file = data.file;
            // [rphub 2.9.042] 区间读：File/Blob 支持 slice，只取勾选的那几段。
            if (ranges) {
                for (const range of ranges) {
                    for (let at = range.start; at < range.end; at += limits.chunkBytes) {
                        await wait();
                        const end = Math.min(range.end, at + limits.chunkBytes);
                        yield new Uint8Array(await readWithTimeout(file.slice(at, end).arrayBuffer()));
                    }
                }
                return;
            }
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
                if (sink) await sink.flush();
                pendingBytes = 0;
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            session.read += buffer.byteLength;
            progress();
        }
        progress('解析收尾');
        const parsed = parser.end();
        // [rphub 2.9.040] 清单这一遍到此为止：不建库、不暂存、不发 complete。
        if (survey) {
            // 旧快照永远导不进去，界面不该把它列成可勾选项，另行说明即可。
            const old = (parsed.skipped || []).filter(item => shouldSkipEntryKey(item.key));
            let oldBytes = 0;
            for (const item of old) oldBytes += Math.max(0, Number(item.bytes) || 0);
            postMessage({ type: 'survey', bytes: session.read, items: parsed.items || [], unitLimit: limits.unitBytes,
                legacyCount: old.length, legacyBytes: oldBytes,
                // [rphub 2.9.042] 把每条的字节区间一并交回去，下一趟就能只读勾选的那几条。
                spans: parsed.spans || [], entriesOpen: parsed.entriesOpen, entriesClose: parsed.entriesClose,
                indexed: !!parsed.indexed });
            return;
        }
        progress('暂存收尾');
        await withTimeout(sink.flush(), 45000, '写入暂存库超时（可能是设备存储空间不足），原数据未改动');
        progress('核对角色卡、聊天与记忆');
        // [rphub 2.9.036] 核对阶段必须持续发消息：主线程的看门狗 45s 收不到任何消息
        //   就会 terminate 这个 worker 并清理暂存，表现就是「进度跑满 100% 后停住」。
        const ticker = setInterval(() => progress(), 1000);
        // [rphub 2.9.037] 核对阶段原来一条记录发一条消息（189 条一次性灌给主线程），
        //   改成 200ms 一条并保证最后一条一定发 —— 否则进度会停在 x/y 不再动。
        let stepNotice = 0;
        const stepProgress = (done, total) => {
            const now = performance.now();
            if (done !== total && now - stepNotice < 200) return;
            stepNotice = now;
            progress('核对数据 ' + done + ' / ' + total);
        };
        try {
            Object.assign(session, await validate(db, session.id, parsed.source, wait, limits.collectionBytes, stepProgress),
                { source: parsed.source, state: 'complete' });
        } finally { clearInterval(ticker); }
        // [rphub 2.9.042] 区间读的硬校验：喂进去几条 entry，就必须落几条。
        //   少一条说明区间算错了 —— 此时宁可整趟报错让用户重来，也不能静默少导几项。
        if (ranges) {
            const expect = ranges.filter(item => item.entry).length;
            const got = (session.plan || []).filter(item => item.source === 'entries').length;
            if (expect && got !== expect)
                throw new Error('按区间读取只得到 ' + got + ' / ' + expect + ' 条，原数据未改动，请重新导入');
        }
        await saveSession(db, session);
        // [rphub 2.9.040] 2.9.039 把被跳过的旧快照逐片 copy 出来攒成一个 Blob 另存 —— 300MB 级
        //   备份等于在 worker 里又留一份完整副本，正好压在「进度 100%」那一刻。原始文件还在
        //   用户手上，不需要第二份。这里只报数量与体积，界面照实说明「已跳过」。
        const legacy = (parsed.skipped || []).filter(item => shouldSkipEntryKey(item.key));
        let legacyBytes = 0;
        for (const item of legacy) legacyBytes += Math.max(0, Number(item.bytes) || 0);
        postMessage({ type: 'complete', summary: session.summary, bytes: data.file?.size || session.read,
            read: session.read, ranged: !!ranges, skipped: parsed.skipped || [],
            legacy, legacyCount: legacy.length, legacyBytes, unitLimit: limits.unitBytes });
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
