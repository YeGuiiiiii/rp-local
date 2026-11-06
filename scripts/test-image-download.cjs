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
  const bytes = fs.readFileSync(path.join(root, 'dist/app-icon.png'));
  const requests = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    requests.push({ url: url.href, method: route.request().method() });
    if (url.pathname === '/bad.png') return route.fulfill({ status: 400, body: 'fixture: rejected request', contentType: 'text/plain' });
    if (url.pathname === '/not-image.png') return route.fulfill({ status: 200, body: '<html>not an image</html>', contentType: 'image/png' });
    if (url.pathname === '/fixture.png') return route.fulfill({ contentType: 'image/png', body: bytes });
    if (url.pathname === '/api/jobs/test/content') return route.fulfill(url.searchParams.get('token') === 'TEST_IMAGE_TOKEN'
      ? { contentType: 'image/png', body: bytes }
      : { status: 400, body: 'missing token' });
    if (url.pathname.includes('_files/')) return route.fulfill({ status: 400, body: 'Native local file must never go to an HTTP downloader' });
    return route.fulfill({ contentType: 'text/html', body: '<!DOCTYPE html><body></body>' });
  });
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/test');
    await page.addScriptTag({ path: path.join(root, 'web/assets/js/image-download.js') });
    const report = await page.evaluate(async ({ base64 }) => {
      const saved = [];
      const notices = [];
      window.AndroidBridge = {
        saveImageToGallery: (bytes, name, mime) => saved.push({ bytes: bytes.length, name, mime }),
        saveImageFromUrl: () => { throw new Error('Old HTTP downloader called'); }
      };
      addEventListener('rp:notice', event => notices.push(event.detail));
      RPLocalFiles.writeImage('图片/有空格 # 和百分号%/one.png', base64);
      const local = await RPImageDownload.save('/RP-Hub/_files/' + ['图片','有空格 # 和百分号%','one.png'].map(encodeURIComponent).join('/'));
      const blob = await (await fetch('/fixture.png')).blob();
      const blobUrl = URL.createObjectURL(blob);
      const blobResult = await RPImageDownload.save(blobUrl);
      URL.revokeObjectURL(blobUrl);
      const card = document.createElement('div');
      card.className = 'generated-image-card';
      card.dataset.imageRequest = 'https://sta1n156.github.io/generate?tag=test&token=TEST_IMAGE_TOKEN';
      const image = document.createElement('img');
      // Set the attribute without appending, so only the saving request is measured.
      image.src = '/api/jobs/test/content';
      card.appendChild(image);
      const remote = await RPImageDownload.save(image);
      let rejected400 = false, rejectedContent = false, rejectedGenerate = false;
      try { await RPImageDownload.run('/bad.png'); } catch (_) { rejected400 = true; }
      try { await RPImageDownload.run('/not-image.png'); } catch (_) { rejectedContent = true; }
      try { await RPImageDownload.run('/generate?tag=must-not-generate'); } catch (_) { rejectedGenerate = true; }
      return { local, blob: blobResult, remote, saved, notices, rejected400, rejectedContent, rejectedGenerate };
    }, { base64: bytes.toString('base64') });
    assert.equal(report.saved.length, 3);
    assert.ok(report.saved.every(image => image.mime === 'image/png' && image.bytes > 100));
    assert.equal(report.rejected400, true);
    assert.equal(report.rejectedContent, true);
    assert.equal(report.rejectedGenerate, true);
    assert.ok(report.notices.some(item => item.error && item.message.includes('HTTP 400')));
    assert.ok(!requests.some(item => item.url.includes('/_files/')), 'Native local image must be read directly');
    assert.ok(!requests.some(item => new URL(item.url).pathname === '/generate'), 'Saving must never trigger image generation');
    assert.ok(requests.some(item => item.url.includes('token=TEST_IMAGE_TOKEN')));
    const summary = {
      nativeLocalVirtualUrlReadWithoutHttp: true,
      encodedCharacterFolderRead: true,
      blobRead: true,
      remoteJobTokenPreserved: true,
      http400Reported: true,
      invalidImageRejected: true,
      generationUrlRejectedBeforeFetch: true,
      successfulNativeSaveCalls: report.saved.length,
      networkGenerationRequests: 0,
    };
    fs.writeFileSync(path.join(root,'verification/image-download.json'),JSON.stringify(summary,null,2));
    console.log(JSON.stringify(summary,null,2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
