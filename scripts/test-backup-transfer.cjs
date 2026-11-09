const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
(async () => {
    const sandbox = { window: {}, Blob, TextEncoder, setTimeout, Uint8Array, ArrayBuffer, btoa };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, 'web/assets/js/backup-format.js'), 'utf8'), sandbox);
    const file = path.join(root, 'web/assets/js/backup-transfer.js');
    if (fs.existsSync(file)) vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
    assert.ok(sandbox.window.RPBackupTransfer, '备份应提供逐段输出而非整包JSON复制');
    const transfer = sandbox.window.RPBackupTransfer;
    const parts = [], notices = [];
    let cardReads = 0;
    const text = '中文😀\\\n"\r\t'.repeat(50000);
    const sources = async function* () {
        yield { key: 'rp_hub_characters', value: { rphubCardLibrary: 1, cards: [{ uuid: 'one' }, { uuid: 'two' }] } };
        yield { key: 'rp_hub_chat_one', value: [{ role: 'user', content: text }, { role: 'assistant', content: '保留原文' }] };
        yield { key: '__ls__:theme', value: 'night' };
        yield { key: 'rp_hub_binary', value: { file: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }) } };
    };
    await transfer.writeBackup({
        profile: 'light', entries: sources(), total: 4,
        transform: entry => JSON.parse(JSON.stringify(entry)),
        readCharacter: async card => { cardReads++; return { ...card, description: '完整卡内世界书' }; },
        write: async text => { parts.push(text); assert.ok(text.length <= 65536, '每次输出保持有界'); },
        progress: value => notices.push(value),
        companions: () => ({ sf_moments_db: { moments: [{ k: 'list', v: [] }] } }),
        webStorage: () => ({ theme: 'night' })
    });
    const parsed = JSON.parse(Buffer.concat(parts.map(text => Buffer.from(text, 'utf8'))).toString('utf8'));
    assert.equal(cardReads, 2);
    assert.equal(parsed.entries[0].value[1].description, '完整卡内世界书');
    assert.equal(parsed.entries[1].value[0].content, text);
    assert.equal(parsed.entries[3].value.file.__rphub_bin__, 'AQID');
    assert.equal(parsed.databases.RPHubDB, undefined, '不重复输出整库');
    assert.equal(parsed.webStorage.localStorage.theme, 'night');
    assert.ok(parts.length > 10);
    assert.equal(notices.at(-1).percent, 100);
    assert.ok(notices.every((value, index) => !index || value.percent >= notices[index - 1].percent));
    for (const [profile, limit] of [['light', 65536], ['balanced', 262144], ['fast', 1048576]]) {
        const chunks = [];
        await transfer.writeBackup({
            profile, entries: [{ key: 'large', value: 'x'.repeat(2200000) }], total: 1,
            write: async text => chunks.push(text)
        });
        assert.ok(chunks.every(text => text.length <= limit));
        assert.ok(chunks.some(text => text.length > limit / 2), profile + ' must actually use its output batch size');
        assert.equal(JSON.parse(chunks.join('')).entries[0].value.length, 2200000);
    }
    let writes = 0;
    await assert.rejects(transfer.writeBackup({
        entries: sources(), total: 4, readCharacter: async value => value,
        write: async () => { if (++writes === 2) throw new Error('磁盘已满'); }
    }), /磁盘已满/);
    console.log('Streaming JSON preserves Unicode, cards, binary and progress; bounded writes and disk failure pass.');
})().catch(error => { console.error(error); process.exitCode = 1; });
