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
function fixture({ automatic, wifi = true, release = manifest, failure = false, saved = [] } = {}) {
    const values = new Map(saved);
    if (automatic !== undefined) values.set('rp-update-notifications', String(automatic));
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
            return { ok: true, json: async () => structuredClone(typeof release === 'function' ? release() : release) };
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
    assert.equal(f.updater.state.showNotice, true, 'Manual checks open the latest release even when reminders are off');
    assert.equal(f.downloads.length, 0, 'Manual checking must not begin a download');
    f.updater.setAutomatic(true);
    assert.equal(f.values.get('rp-update-notifications'), 'true');
    f.updater.stop();

    f = fixture();
    await f.updater.start();
    assert.equal(f.updater.state.automatic, true, 'New and upgraded installs receive update reminders by default');
    assert.equal(f.updater.state.showNotice, true);
    assert.equal(f.downloads.length, 0, 'Discovering an update never downloads without user confirmation');
    f.updater.dismiss();
    assert.equal(f.updater.state.showNotice, false);
    assert.equal(f.updater.state.latest.versionName, '2.9.027', 'Closing keeps the update available in Settings');
    f.updater.stop();

    f = fixture({ wifi: false });
    await f.updater.start();
    assert.equal(f.updater.state.phase, 'available');
    assert.equal(f.downloads.length, 0, 'A reminder must not download on mobile data');
    f.updater.download();
    assert.equal(f.downloads[0].automatic, false);
    f.updater.stop();

    let release = manifest;
    f = fixture({ release: () => release });
    await f.updater.start();
    assert.ok(['yueyue', 'honghualing'].includes(f.updater.state.mascot));
    f.updater.dismiss();
    const saved = [...f.values];
    f = fixture({ saved: saved.filter(([key]) => key !== 'rp-update-checked') });
    await f.updater.start();
    assert.equal(f.updater.state.showNotice, false, 'The same dismissed version stays quiet for a day across restarts');
    await f.updater.check();
    assert.equal(f.updater.state.showNotice, true, 'Manual checks can reopen a dismissed release');
    f.updater.dismiss();
    f = fixture({ release: () => release, saved: [...f.values].filter(([key]) => key !== 'rp-update-checked') });
    release = { ...manifest, versionName: '2.9.028', versionCode: 292 };
    await f.updater.start();
    assert.equal(f.updater.state.showNotice, true, 'Dismissing one version must not hide a newer version');
    assert.equal(f.updater.state.latest.versionName, '2.9.028');
    f.updater.stop();

    f = fixture({ saved: [['rp-auto-update', 'false']] });
    await f.updater.start();
    assert.equal(f.updater.state.showNotice, true, 'The old download switch must not disable the new reminder default');
    assert.equal(f.downloads.length, 0);
    f.updater.stop();

    f = fixture({ saved: [['rp-update-dismissed', JSON.stringify({ code: 291, at: Date.now() - 25 * 3600000 })]] });
    await f.updater.start();
    assert.equal(f.updater.state.showNotice, true, 'A dismissed update may be shown again after a day');
    f.updater.stop();

    f = fixture({ release: { ...manifest, versionCode: 289 } });
    await f.updater.check();
    assert.equal(f.updater.state.phase, 'current');
    assert.equal(f.updater.state.showNotice, false);
    assert.equal(f.downloads.length, 0, 'An older server release is not an upgrade');
    f.updater.stop();

    for (const changes of [{ channel: 'beta' }, { packageName: 'other.app' },
        { sha256: '' }, { url: 'http://example.com/app.apk' }, { versionCode: 0 }]) {
        f = fixture({ release: { ...manifest, ...changes } });
        await f.updater.check();
        assert.equal(f.updater.state.phase, 'error', JSON.stringify(changes));
        assert.equal(f.updater.state.showNotice, false, 'Invalid manifests never open an update popup');
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
    console.log('Update controller: reminder defaults, latest version, dismissal, manual download, validation and failure handling passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
