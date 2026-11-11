const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../web/assets/js/app.js'), 'utf8');
const notices = [];
const context = vm.createContext({
    window: { AndroidBridge: { saveFile() {} } },
    Blob, cardUtils: { encodeBase64Utf8: text => Buffer.from(text).toString('base64') },
    showToast: text => notices.push(text)
});
const start = source.indexOf('        const memToolsDownload = ');
const end = source.indexOf('        const memToolsMemoriesText = ', start);
vm.runInContext('const MEM_TOOLS_EXPORT_MAX_BYTES = 8 * 1024 * 1024;\n'
    + source.slice(start, end) + '\nmemToolsDownload("memory.txt", "text/plain", "内容");', context);
assert.ok(!notices.some(text => /已保存|已导出|下载目录/.test(text)),
    'An asynchronous bridge call must not announce a successful save or invent its location: ' + notices);
const finishStart = source.indexOf('        const finishChunkedBackup = ');
const finishEnd = source.indexOf('        const abortChunkedBackup = ', finishStart);
context.abortChunkedBackup = session => { session.aborted = true; };
context.session = { token: 'test', target: 'downloads',
    bridge: { finishBackupWrite: () => 'OK:/storage/emulated/0/Download/RP本地版/数据备份/export-1.json' } };
(async () => {
    await vm.runInContext(source.slice(finishStart, finishEnd) + '\nfinishChunkedBackup(session, 3);', context);
    assert.ok(notices.at(-1).includes('/storage/emulated/0/Download/RP本地版/数据备份/export-1.json'));
    context.session = { token: 'failed', target: 'downloads', bridge: { finishBackupWrite: () => 'ERR:发布失败' } };
    const count = notices.length;
    await assert.rejects(vm.runInContext('finishChunkedBackup(session, 3);', context), /发布失败/);
    assert.equal(notices.length, count, 'Publishing failure must not show a success notice');
    assert.equal(context.session.aborted, true);
    console.log('PASS: native memory exports wait; backup results supply the saved path; failures abort without success');
})().catch(error => { console.error(error); process.exitCode = 1; });
