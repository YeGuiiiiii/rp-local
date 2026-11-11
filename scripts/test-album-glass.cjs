const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const fixture = path.resolve(process.argv[2] || path.join(root, 'dist/app-icon.png'));
const png = fs.readFileSync(fixture);
const sourceSize = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
const output = path.join(root, 'verification/album-glass-1.03');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await context.addInitScript(installFileBridge);
  const page = await context.newPage(), errors = [], snapshots = [];
  page.on('pageerror', error => errors.push(error.message));
  let posts = 0;
  await context.route('**/*', route => {
    if (route.request().method() === 'POST') posts++;
    const url = new URL(route.request().url());
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    if (url.pathname === '/portrait.png') return route.fulfill({ body: png, contentType: 'image/png' });
    if (url.pathname === '/square.png') return route.fulfill({ path: path.join(root, 'dist/app-icon.png'), contentType: 'image/png' });
    const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
      return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
  });
  const cover = page.locator('.shell-album-cover').first();
  const dimensions = () => cover.evaluate(el => {
    const image = el.querySelector('img'), aperture = el.firstElementChild;
    const r = el.getBoundingClientRect(), a = aperture.getBoundingClientRect(), i = image.getBoundingClientRect();
    const style = getComputedStyle(el), glass = getComputedStyle(aperture, '::after');
    return {
      width: r.width, height: r.height, sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight,
      padding: style.padding, border: style.borderWidth, background: style.backgroundColor,
      imageWidth: i.width, imageHeight: i.height,
      edges: [a.left-r.left, a.top-r.top, a.right-r.right, a.bottom-r.bottom],
      glass: { background: glass.backgroundImage, shadow: glass.boxShadow, pointerEvents: glass.pointerEvents },
      saveable: RPImagePolicy.isContentImage(image),
      overflow: document.documentElement.scrollWidth > innerWidth
    };
  });
  const check = geometry => {
    assert.ok(Math.abs(geometry.width / geometry.height - geometry.sourceWidth / geometry.sourceHeight) < .002, JSON.stringify(geometry));
    assert.equal(geometry.padding, '0px');
    assert.equal(geometry.border, '0px');
    assert.equal(geometry.background, 'rgba(0, 0, 0, 0)');
    assert.ok(geometry.edges.every(value => Math.abs(value) < .5));
    assert.ok(Math.abs(geometry.imageWidth - geometry.width) < .5);
    assert.ok(Math.abs(geometry.imageHeight - geometry.height) < .5);
    assert.ok(geometry.glass.background.includes('linear-gradient'));
    assert.equal(geometry.glass.pointerEvents, 'none');
    assert.equal(geometry.saveable, false);
    assert.equal(geometry.overflow, false);
  };
  try {
    await page.goto('https://sta1n156.github.io/RP-Hub/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
    await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
      __qa.characters = ['大梦未觉', '月光手账', '图片暂不可用', '没有封面的相簿'].map((name, index) => ({
        uuid: 'glass-' + index, name, avatar: ['/portrait.png', '/square.png', '/missing.png', ''][index],
        description: '', first_mes: '', worldInfo: [], regexScripts: [], uiTemplates: []
      }));
      __qa.navigateWorkspace('album');
    });
    await page.waitForFunction(() => document.querySelector('.shell-album-cover')?.style.getPropertyValue('--album-ratio'));
    await page.locator('.shell-album-cover img.is-missing').waitFor({ state: 'attached' });
    for (const [width, height] of [[360, 640], [390, 844], [768, 1024], [1280, 900]]) {
      await page.setViewportSize({ width, height });
      for (const mode of ['day', 'night']) {
        await page.evaluate(mode => RPHubThemeKit.setScheme(mode), mode);
        await page.waitForTimeout(200);
        const geometry = await dimensions();
        check(geometry);
        const file = `album-${width}-${mode}.png`;
        await page.screenshot({ path: path.join(output, file), scale: 'css' });
        snapshots.push({ file, width, mode, ...geometry });
      }
    }
    // A source change must resize the same mounted cover, including recovery from a failed load.
    const wide = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 600; canvas.height = 300;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#526c60'; ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = '#c8a1ad'; ctx.fillRect(300, 0, 300, 300);
      return canvas.toDataURL('image/png');
    });
    await page.evaluate(wide => __qa.characters[0].avatar = wide, wide);
    await page.waitForFunction(() => document.querySelector('.shell-album-cover img')?.naturalWidth === 600);
    check(await dimensions());
    await page.evaluate(() => __qa.characters[0].avatar = '/missing-again.png');
    await cover.locator('img.is-missing').waitFor({ state: 'attached' });
    assert.equal(await cover.locator('.shell-icon').evaluate(el => getComputedStyle(el).visibility), 'visible');
    assert.equal(await cover.evaluate(el => el.style.getPropertyValue('--album-ratio')), '');
    await page.evaluate(() => __qa.characters[0].avatar = '/portrait.png');
    await page.waitForFunction(width => document.querySelector('.shell-album-cover img')?.naturalWidth === width, sourceSize.width);
    check(await dimensions());
    await page.getByRole('button', { name: '打开相簿：大梦未觉', exact: true }).click();
    await page.getByRole('heading', { name: '相簿还是空的', exact: true }).waitFor();
    await page.getByRole('button', { name: '返回画廊', exact: true }).click();
    assert.deepEqual(errors, []);
    assert.equal(posts, 0);
    const report = { sourceSize, snapshots, changedSourceRatio: true, missingAndRecovery: true,
      albumNavigation: true, softwareImagesNotSaveable: true, generatedRequests: posts, errors,
      androidDeviceTested: false, fixtureIncludedInApk: false };
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ sourceSize, screenshots: snapshots.length, changedSourceRatio: true, missingAndRecovery: true, posts, errors }));
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
