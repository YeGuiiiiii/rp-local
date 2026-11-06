const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  await context.addInitScript(installFileBridge);
  const page = await context.newPage();
  let downloads = 0;
  await context.route('**/*', async route => {
    if (route.request().url().endsWith('/original.png')) {
      downloads++;
      return route.fulfill({ path: path.join(root, 'dist', 'app-icon.png'), contentType: 'image/png' });
    }
    return route.fulfill({ contentType: 'text/html', body: '<!DOCTYPE html><div id="card"><img></div>' });
  });
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/test');
    for (const relative of ['assets/js/local-files.js', 'assets/native/rphub-image-vault.js']) {
      await page.addScriptTag({ path: path.join(root, 'web', relative) });
    }
    const report = await page.evaluate(async () => {
      const request = 'https://images.test/generate?tag=red%20cat%2C%20blue%20sky&artist=a&token=TEST';
      const owner = { uuid: 'image-card-a', storageFolder: '图片测试卡', identity: 'image-card-a::message-one#0' };
      const original = await (await fetch('original.png')).blob();
      const compressed = await RPHubImageVault.compress(original);
      const before = await createImageBitmap(original);
      const after = await createImageBitmap(compressed);
      const [one, duplicate] = await Promise.all([
        RPHubImageVault.remember(request, 'original.png', owner),
        RPHubImageVault.remember(request, 'original.png', owner),
      ]);
      const card = document.getElementById('card');
      const restored = await RPHubImageVault.restore(card, request.replace('artist=a', 'artist=b'), owner);
      const crossOwner = { ...owner, uuid: 'image-card-b', storageFolder: '另一张卡', identity: 'image-card-b::message-one#0' };
      const crossHit = await RPHubImageVault.restore(card, request, crossOwner);
      const legacyKey = 'https://images.test/generate?artist=a&tag=old tag';
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('RPHubImageVaultV1', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite');
        tx.objectStore('images').put({ k: legacyKey, b: original, g: 'old tag', n: original.size });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      const legacy = await RPHubImageVault.restore(card, 'https://images.test/generate?artist=a&tag=old%20tag', { ...owner, identity: 'old-message#0' });
      return {
        originalBytes: original.size, compressedBytes: compressed.size, type: compressed.type,
        dimensionsPreserved: before.width === after.width && before.height === after.height,
        width: after.width, height: after.height,
        concurrentDownloadsDeduplicated: one.url === duplicate.url,
        artistChangeRestoredLocal: restored,
        crossCharacterImageNotReused: !crossHit,
        oldCacheMigrated: legacy,
        files: Object.keys(__qaNativeFiles).filter(name => !name.endsWith('.json')),
      };
    });
    assert.equal(downloads, 2, 'One fixture download and one deduplicated image save');
    assert.ok(report.compressedBytes < report.originalBytes);
    for (const key of ['dimensionsPreserved', 'concurrentDownloadsDeduplicated', 'artistChangeRestoredLocal', 'crossCharacterImageNotReused', 'oldCacheMigrated']) assert.equal(report[key], true, key);
    fs.writeFileSync(path.join(root, 'verification', 'images.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
