const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../web/assets/js/app-updates.js');
assert.ok(fs.existsSync(file), 'The app needs a shared update controller');
const { createUpdater } = require(file);
const manifest = {
    schema: 1, channel: 'stable', packageName: 'com.rphub.local',
    versionName: '2.9.027', versionCode: 291, size: 1234, sha256: 'a'.repeat(64),
    url: 'https://121.40.147.125/updates/stable/RP-local-2.9.027.apk', notes: '更新测试'
};
function fixture({ automatic = true, wifi = true, release = manifest, failure = false } = {}) {
    const values = new Map([['rp-auto-update', String(automatic)]]);
    const requests = [], downloads = [], notices = [];
    const bridge = {
        isUnmetered: () => wifi, state: () => JSON.stringify({ phase: 'idle' }),
        download: text => downloads.push(JSON.parse(text)), install() {}
    };
    const updater = createUpdater({
        currentCode: 290, currentVersion: '2.9.026', bridge: () => bridge,
        storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
        fetch: async url => {
            requests.push(url);
            if (failure) throw new Error('offline');
            return { ok: true, json: async () => structuredClone(release) };
        },
        notice: message => notices.push(message)
    });
    return { updater, requests, downloads, values, notices };
}
(async () => {
    let f = fixture({ automatic: false });
    await f.updater.start();
    assert.equal(f.requests.length, 0, 'Disabled automatic updates must not call the network');
    await f.updater.check();
    assert.equal(f.updater.state.phase, 'available');
    assert.equal(f.downloads.length, 0, 'Manual checking must not begin a download');
    f.updater.setAutomatic(true);
    assert.equal(f.values.get('rp-auto-update'), 'true');
    f.updater.stop();

    f = fixture();
    await f.updater.start();
    assert.equal(f.downloads.length, 1);
    assert.equal(f.downloads[0].automatic, true);
    f.updater.stop();

    f = fixture({ wifi: false });
    await f.updater.start();
    assert.equal(f.updater.state.phase, 'available');
    assert.equal(f.downloads.length, 0, 'Automatic updates must not use metered data');
    f.updater.download();
    assert.equal(f.downloads[0].automatic, false);
    f.updater.stop();

    f = fixture({ release: { ...manifest, versionCode: 289 } });
    await f.updater.check();
    assert.equal(f.updater.state.phase, 'current');
    assert.equal(f.downloads.length, 0, 'An older server release is not an upgrade');
    f.updater.stop();

    for (const changes of [{ channel: 'beta' }, { packageName: 'other.app' },
        { sha256: '' }, { url: 'http://example.com/app.apk' }, { versionCode: 0 }]) {
        f = fixture({ release: { ...manifest, ...changes } });
        await f.updater.check();
        assert.equal(f.updater.state.phase, 'error', JSON.stringify(changes));
        assert.equal(f.downloads.length, 0);
        f.updater.stop();
    }
    f = fixture({ failure: true });
    await f.updater.start();
    assert.equal(f.updater.state.phase, 'error');
    assert.equal(f.notices.length, 0, 'Background connection errors must not interrupt chatting');
    const calls = f.requests.length;
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(f.requests.length, calls, 'Failures must not start a retry loop');
    f.updater.stop();
    console.log('Update controller: automatic/manual checks, Wi-Fi policy, persistence, validation and failure handling passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
