const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const adbPath = path.join(process.env.USERPROFILE, '.cache/rp-beta-toolchain/android-sdk/platform-tools/adb.exe');
const serial = process.env.RP_TEST_EMULATOR;
assert.match(serial || '', /^emulator-\d+$/, 'Set RP_TEST_EMULATOR to an isolated emulator');
const adb = (...args) => execFileSync(adbPath, ['-s', serial, ...args], { encoding: 'utf8', timeout: 30000 }).trim();
assert.equal(adb('shell', 'getprop', 'ro.kernel.qemu'), '1');
const pid = adb('shell', 'pidof', 'com.rphub.local');
adb('forward', 'tcp:9232', 'localabstract:webview_devtools_remote_' + pid);
const output = path.join(root, 'verification/card-night-2.9.012');
fs.mkdirSync(output, { recursive: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, sequence = 0;
const pending = new Map();
async function connect() {
    socket?.close();
    const tabs = await (await fetch('http://127.0.0.1:9232/json/list')).json();
    const tab = tabs.find(item => JSON.parse(item.description).attached) || tabs[0];
    socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = event => {
        const message = JSON.parse(event.data), job = pending.get(message.id);
        if (!job) return;
        pending.delete(message.id);
        if (message.error) job.reject(new Error(JSON.stringify(message.error)));
        else job.resolve(message.result);
    };
}
async function command(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timed out')); }, 10000);
        pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); },
            reject: error => { clearTimeout(timer); reject(error); } });
        socket.send(JSON.stringify({ id, method, params }));
    });
}
async function evaluate(fn, ...args) {
    const reply = await command('Runtime.evaluate', { expression: '(' + fn.toString() + ')(...' + JSON.stringify(args) + ')',
        awaitPromise: true, returnByValue: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description);
    return reply.result.value;
}
async function ready() {
    for (let attempt = 0; attempt < 30; attempt++) {
        if (await evaluate(() => !!window.__rpDataReady && !document.querySelector('.entry-transition'))) return;
        await pause(200);
    }
    throw new Error('Android startup did not finish');
}
(async () => {
    const source = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).data;
    await connect();
    try {
        await ready();
        await evaluate(async data => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false; __qa.showAnnouncement = false;
            __qa.user.name = '夜间验证';
            __qa.characters = [{
                uuid: 'qa-teyvat-night', name: data.name, first_mes: data.first_mes, worldInfo: [], uiTemplates: [],
                regexScripts: data.regexScripts.map(script => RPHubCardUtils.normalizeImportedRegexScript(script,
                    { fallbackScope: 'character', systemNames: [] }))
            }];
            await __qa.selectCharacter(0);
            RPCardNight.setMode('original');
            await RPLocalStore.flush();
            setTimeout(() => RPThemePacks.setMode('night'), 100);
        }, { name: source.name, first_mes: source.first_mes, regexScripts: source.extensions.regex_scripts });
        await pause(1500);
        await connect();
        await ready();
        const state = await evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            return { uuid: __qa.currentCharacter?.uuid, theme: RPThemePacks.mode, version: RP_LOCAL_VERSION };
        });
        assert.equal(state.uuid, 'qa-teyvat-night');
        assert.equal(state.theme, 'night');
        const samples = [];
        for (const mode of ['original', 'auto', 'original']) {
            const sample = await evaluate(mode => {
                RPCardNight.setMode(mode);
                const frame = document.querySelector('.executable-html-frame');
                const rect = frame.getBoundingClientRect();
                return { mode, active: document.documentElement.dataset.cardAutoDark,
                    width: innerWidth, x: rect.x + rect.width * .85, y: rect.y + rect.height * .25 };
            }, mode);
            assert.equal(sample.active, String(mode === 'auto'));
            await pause(350);
            const screenshot = await command('Page.captureScreenshot', { format: 'png' });
            sample.file = path.join(output, `${samples.length}-${mode}.png`);
            fs.writeFileSync(sample.file, Buffer.from(screenshot.data, 'base64'));
            samples.push(sample);
        }
        const pixels = JSON.parse(execFileSync('python', ['-c',
            `import json, sys
from PIL import Image
pixels = []
for sample in json.loads(sys.argv[1]):
    image = Image.open(sample["file"]).convert("RGB")
    ratio = image.width / sample["width"]
    pixels.append(image.getpixel((round(sample["x"] * ratio), round(sample["y"] * ratio))))
print(json.dumps(pixels))`,
            JSON.stringify(samples)], { encoding: 'utf8' }));
        const luminance = rgb => rgb.reduce((sum, value) => sum + value, 0) / 3;
        assert.ok(luminance(pixels[0]) > 180, JSON.stringify(pixels));
        assert.ok(luminance(pixels[1]) < 100, JSON.stringify(pixels));
        assert.ok(luminance(pixels[2]) > 180, JSON.stringify(pixels));
        const report = { state, samples, pixels };
        fs.writeFileSync(path.join(output, 'android.json'), JSON.stringify(report, null, 2));
        console.log(JSON.stringify(report, null, 2));
        console.log('PASS Android renders the original Teyvat opening dark and restores its authored colors');
    } finally { socket.close(); }
})().catch(error => { console.error(error); socket?.close(); process.exitCode = 1; });
