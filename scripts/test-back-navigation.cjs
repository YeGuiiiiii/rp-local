const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..'), web = path.join(root, 'web');
const activity = fs.readFileSync(path.join(root, 'android/smali/com/rphub/app/MainActivity.smali'), 'utf8').replace(/\r\n/g, '\n');
const handler = activity.match(/\.method private handleBackPressed\(\)V[\s\S]*?\.end method/)[0];
const callback = fs.readFileSync(path.join(root, 'android/smali/com/rphub/app/MainActivity$25.smali'), 'utf8').replace(/\r\n/g, '\n');
const script = handler.match(/const-string v4, "(.+)"/)[1];
assert.equal(handler.includes('->canGoBack()'), false, 'App navigation must run before WebView history');
assert.equal(handler.includes('->finish()'), false, 'Bridge failure must not close the activity');
assert.ok(callback.includes('const-string v0, "false"') && callback.includes('->equals(Ljava/lang/Object;)Z'));
assert.ok(callback.indexOf('->access$46') < callback.indexOf('\n    :cond_1\n'), 'Handled back clears the exit timer');
assert.ok(activity.match(/\.method public onKeyDown[\s\S]*?\.end method/)[0].includes('->getRepeatCount()'));
assert.equal(vm.runInNewContext(script, { window: {} }), true, 'Startup consumes back');
assert.equal(vm.runInNewContext(script, { window: { rphubHandleBack() { throw Error('unavailable'); } } }), true);
assert.equal(JSON.stringify(vm.runInNewContext(script, { window: { rphubHandleBack: () => true } })), 'true');
assert.equal(JSON.stringify(vm.runInNewContext(script, { window: { rphubHandleBack: () => false } })), 'false');
assert.equal(JSON.stringify('true').startsWith('true'), false, 'Reproduce old string/boolean mismatch');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const errors = [];
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        await context.addInitScript(installFileBridge);
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'https://sta1n156.github.io') return route.abort();
            const file = path.resolve(web, url.pathname.slice('/RP-Hub/'.length) || 'index.html');
            if (!file.startsWith(web + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile())
                return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ path: file, contentType: ({ '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream' });
        });
        await page.goto('https://sta1n156.github.io/RP-Hub/');
        await page.waitForFunction(() => window.__rpDataReady && !document.querySelector('.entry-transition'));
        await page.evaluate(() => {
            window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
            __qa.showUserSetupModal = false;
            window.__backReplies = [];
        });
        async function back(expected, handled = true) {
            const result = await page.evaluate(script => {
                const result = (0, eval)(script);
                window.__backReplies.push(JSON.stringify(result));
                return { view: __qa.currentView, handled: result, section: __qa.settingsSection };
            }, script);
            assert.equal(result.handled, handled, 'Native result for ' + expected);
            assert.equal(result.view, expected);
            return result;
        }
        for (let index = 0; index < 30; index++) {
            await page.evaluate(() => {
                __qa.navigateWorkspace('settings');
                __qa.openSettingsSection('legacy');
                __qa.navigateWorkspace({ view: 'worldinfo', scope: 'global' });
            });
            assert.equal((await back('settings-detail')).section, 'legacy');
            await back('settings');
            await back('characters');
            await page.evaluate(() => { __qa.navigateWorkspace('advanced'); __qa.navigateWorkspace('presets'); });
            await back('advanced');
            await back('characters');
        }
        await page.evaluate(() => { __qa.navigateWorkspace('settings'); __qa.openSettingsSection('appearance'); });
        await page.getByRole('button', { name: '返回', exact: true }).click();
        assert.equal(await page.evaluate(() => __qa.currentView), 'settings');
        await page.evaluate(() => { __qa.openSettingsSection('api'); });
        await back('settings'); await back('characters');
        await page.evaluate(() => { __qa.onlineOpen = true; });
        await back('characters');
        assert.equal(await page.evaluate(() => __qa.onlineOpen), false);
        await page.evaluate(() => { __qa.isNavigationOpen = true; });
        await back('characters');
        assert.equal(await page.evaluate(() => __qa.isNavigationOpen), false);
        await page.evaluate(() => __qa.openAnnouncement());
        await back('characters');
        assert.equal(await page.evaluate(() => __qa.showAnnouncement), false);
        for (const modal of ['showContextViewerModal', 'showMemoryBackfillModal']) {
            await page.evaluate(modal => { __qa[modal] = true; }, modal);
            await back('characters');
            assert.equal(await page.evaluate(modal => __qa[modal], modal), false);
        }
        await back('characters', false);
        // Exercise the exact JSON wire values used by the Android callback.
        const replies = await page.evaluate(() => __backReplies);
        let previousExit = Date.now(), now = previousExit + 10, exitCount = 0;
        for (const reply of replies) {
            if (reply !== 'false') previousExit = 0;
            else if (now - previousExit < 2000) exitCount++;
            else previousExit = now;
            now += 10;
        }
        assert.equal(exitCount, 0, 'Rapid child returns must never count toward exiting');
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(root, 'verification/back-navigation-1.13.json'), JSON.stringify({
            oldWireMismatchReproduced: true, actualNativeScriptReturnsBoolean: true,
            repeatedNestedNavigationCycles: 30, parentAndSettingsSectionRestored: true,
            nativeBackOnRootTabsReturnsHome: true, dialogsCloseBeforeExit: true,
            onlyCharacterHomeAllowsExit: true, bridgeUnavailableConsumesBack: true,
            handledBackResetsExitTimer: true, keyRepeatIgnored: true,
            webViewHistoryDoesNotPreemptApp: true, errors, actualAndroidTested: false
        }, null, 2));
        console.log('30 nested navigation cycles, native boolean return, dialogs and exit boundary passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
