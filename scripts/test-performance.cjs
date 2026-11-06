const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFiles = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const label = process.argv[2] || 'after';
const output = path.join(root, 'verification/performance-1.04');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(installFiles);
  await context.addInitScript(() => {
    window.__bridgeStats = { calls: {}, returnedBytes: 0 };
    for (const name of ['readText', 'writeText', 'writeTextIfChanged', 'list']) {
      if (!RPLocalFiles[name]) continue;
      const original = RPLocalFiles[name];
      RPLocalFiles[name] = (...args) => {
        __bridgeStats.calls[name] = (__bridgeStats.calls[name] || 0) + 1;
        const result = original(...args);
        __bridgeStats.returnedBytes += result.length;
        return result;
      };
    }
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://sta1n156.github.io') return route.abort();
    if (url.pathname === '/seed') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
    const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
    if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
      return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('https://sta1n156.github.io/seed');
    await page.addScriptTag({ path: path.join(web, 'assets/vendor/vue.global.prod.js') });
    await page.addScriptTag({ path: path.join(web, 'assets/js/local-files.js') });
    await page.addScriptTag({ path: path.join(web, 'assets/js/stream-import.js') });
    await page.addScriptTag({ content: fs.readFileSync(path.join(web, 'assets/js/data-services.js'), 'utf8').split('// --- Shared summary memory utilities ---')[0] });
    await page.evaluate(async () => {
      await RPHubStorage.initDB();
      const cards = Array.from({ length: 24 }, (_, i) => ({
        uuid: `perf-card-${i}`, name: `性能测试 ${i}`, createdAt: i + 1,
        first_mes: '一段用于性能检查的开场。', description: '', worldInfo: [], regexScripts: [], uiTemplates: []
      }));
      await RPHubStorage.setStoredValue('characters', cards);
      for (const card of cards) {
        await RPHubStorage.setScopedStoredValue('chat', card.uuid, Array.from({ length: 20 }, (_, i) => ({
          id: `${card.uuid}-${i}`, role: i % 2 ? 'assistant' : 'user',
          content: '用于加载检查的虚构剧情。'.repeat(60), shouldAnimate: false
        })));
        await RPHubStorage.setScopedStoredValue('classic_memories', card.uuid, [
          { classicMemory: true, no: 1, turn: 1, summary: `${card.name}已有记忆` }
        ]);
      }
      await RPHubStorage.setStoredValue('user', { uuid: 'perf-user', name: '性能测试', person: 'second' });
      await RPLocalStore.flush();
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    if (process.argv.includes('--profile')) {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.start');
    }
    const runs = [];
    for (let i = 0; i < (process.argv.includes('--profile') ? 1 : 3); i++) {
      await page.goto('https://sta1n156.github.io/RP-Hub/', { waitUntil: 'load' });
      await page.waitForFunction(() => window.__rpDataReady);
      const ready = await page.evaluate(() => {
        window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
        __qa.showUserSetupModal = false;
        return { dataReadyMs: performance.now(), bridgeAtReady: JSON.parse(JSON.stringify(__bridgeStats)) };
      });
      await page.waitForFunction(() => !document.querySelector('.entry-transition'));
      const visibleMs = await page.evaluate(() => performance.now());
      const opens = [];
      for (const index of [0, 1]) {
        opens.push(await page.evaluate(async index => {
          const start = performance.now();
          await __qa.selectCharacter(index);
          return performance.now() - start;
        }, index));
      }
      assert.equal(await page.evaluate(async () => (await RPHubStorage.getScopedStoredValue('classic_memories', 'perf-card-1'))[0].summary), '性能测试 1已有记忆');
      await page.evaluate(async () => { await RPLocalStore.flush(); });
      runs.push({ ...ready, visibleMs, openCharacterMs: opens });
    }
    assert.deepEqual(errors, []);
    const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
    const report = {
      environment: 'Desktop Edge, CPU throttled 4x; simulated file bridge, 24 cards and 48 scoped records. Not Android timing.',
      runs, medianDataReadyMs: median(runs.map(run => run.dataReadyMs)),
      medianVisibleMs: median(runs.map(run => run.visibleMs)),
      medianOpenCharacterMs: median(runs.flatMap(run => run.openCharacterMs)), errors
    };
    if (process.argv.includes('--profile')) {
      const { profile } = await cdp.send('Profiler.stop');
      const times = new Map(), nodes = new Map(profile.nodes.map(node => [node.id, node]));
      profile.samples.forEach((id, i) => {
        const f = nodes.get(id).callFrame, key = `${f.url.split('/').pop()}:${f.lineNumber} ${f.functionName}`;
        times.set(key, (times.get(key) || 0) + profile.timeDeltas[i] / 1000);
      });
      report.cpuSelfMs = [...times].sort((a,b) => b[1]-a[1]).slice(0,20);
    }
    fs.writeFileSync(path.join(output, `${label}.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
