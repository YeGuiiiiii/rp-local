const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname, '..');
const originalVersion = process.argv.includes('--118') ? '2.8.118' : process.argv.includes('--116') ? '2.8.116' : '2.8.80';
const originalRoot = originalVersion !== '2.8.80' ? path.join(root,'reference/original-'+originalVersion) : path.resolve(root, '../RP-Hub-v2.8.80-检查');
const origin = 'https://sta1n156.github.io';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const contexts = [];
  async function load(original = false) {
    const context = await browser.newContext();
    contexts.push(context);
    if (!original) await context.addInitScript(installFileBridge);
    if (original) await context.addInitScript(() => {
      if (window.top === window) localStorage.setItem('roleplay_hub_update_id', '99999999');
    });
    const page = await context.newPage();
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      let file;
      if (url.origin === origin) {
        const relative = url.pathname.replace(/^\/RP-Hub\//, '') || 'index.html';
        if (original) {
          const basename = path.basename(relative);
          file = [path.join(originalRoot,originalVersion !== '2.8.80'?'patched':'patched-seed',basename), path.join(originalRoot,'apk-extracted/assets/patch-seed',basename)].find(fs.existsSync);
        } else file = path.join(root,'web',relative);
      } else if (original) {
        const map = { 'cdn.tailwindcss.com': 'tailwind.js', 'unpkg.com': 'vue.global.prod.js' };
        file = path.join(originalRoot,'apk-extracted/assets/assets/vendor',map[url.hostname] || path.basename(url.pathname).toLowerCase());
      }
      if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
      return route.fulfill({ path: file, contentType: ({'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)] || 'application/octet-stream' });
    });
    await page.goto(origin+'/RP-Hub/',{waitUntil:'load'});
    await page.waitForFunction(() => !!document.getElementById('app')?.__vue_app__);
    if (!original) await page.waitForFunction(() => window.__rpDataReady);
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.__qa = document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal = false;
    });
    return page;
  }
  async function seed(page) {
    await page.evaluate(async () => {
      const s = RPHubStorage;
      const cards = [{
        uuid: 'backup-card-uuid', name: '原版兼容测试卡', first_mes: '原版开场',
        description: '卡片描述', avatar: '', createdAt: 1700000000000,
        worldInfo: [{ comment:'私有世界书', content:'世界书正文', keys:['测试词'], enabled:true, scope:'character' }],
        regexScripts: [{ name:'私有正则', regex:'/test/g', replacement:'测试', enabled:false, placement:[2], scope:'character' }],
        uiTemplates: [{ id:'backup-ui', name:'测试面板', scope:'character', enabled:false, htmlTemplate:'<p>卡片 UI</p>', initialVariableState:{a:1}, variableSchema:'a:number' }]
      }];
      await s.setStoredValue('characters',cards);
      await s.setStoredValue('presets',[{name:'原版自定义预设',content:'必须保留的预设正文',enabled:true,role:'system',group:'测试组'}]);
      await s.setStoredValue('preset_groups',['STA1N官方分组','测试组','备份中的空组']);
      await s.setStoredValue('user',{uuid:'user-test',name:'测试人设',description:'测试人设描述',person:'second'});
      await s.setStoredValue('user_profiles',[{uuid:'user-test',name:'测试人设',description:'测试人设描述',person:'second'}]);
      await s.setStoredValue('active_profile_id','user-test');
      await s.setStoredValue('last_active_char',0);
      await s.setStoredValue('settings',{apiUrl:'https://example.invalid/v1',apiKey:'FAKE_TEST_KEY',model:'test-model',imageGenKey:'FAKE_IMAGE_KEY',retainedCompatibilityField:{from:'future-version',keep:true}});
      await s.setStoredValue('binary_attachment_fixture',{
        file:{__rphub_bin__:'AQID',__rphub_type__:'Blob',__rphub_mime__:'application/octet-stream'},
        buffer:{__rphub_bin__:'BAUG',__rphub_type__:'ArrayBuffer'}
      });
      await s.setScopedStoredValue('branches','backup-card-uuid',{version:1,activeBranchId:'branch-two',branches:[{id:'main',name:'主线'},{id:'branch-two',name:'第二条分支',parentId:'main'}]});
      await s.setScopedStoredValue('chat','backup-card-uuid',[{id:'main-message',role:'assistant',content:'主线正文'}]);
      await s.setScopedStoredValue('chat','backup-card-uuid__branch__branch-two',[{id:'branch-message',role:'assistant',content:'分支正文'}]);
      const memories=[{classicMemory:true,turn:1,no:1,summary:'分支总结',embeddingQ:'AAAA',embeddingScale:.1,embeddingDims:3,embeddingEncoding:'int8',embeddingModel:'test-embedding'}];
      if (s.replaceMemoryScopeList) {
        await s.replaceMemoryScopeList('backup-card-uuid__branch__branch-two',memories);
        await s.replaceMemoryScopeList('deleted-memory-scope',memories);
        await s.deleteMemoryScope('deleted-memory-scope');
      } else await s.setScopedStoredValue('classic_memories','backup-card-uuid__branch__branch-two',memories);
      localStorage.setItem('rphub-image-freeze::backup-card-uuid','{"m:main-message#0":{"tag":"tag","url":"https://example.invalid/image.png"}}');
      localStorage.setItem('test-ui-preference','keep-this');
    });
  }
  async function exportData(page) {
    await page.evaluate(() => {
      window.__exported = null;
      window.AndroidBridge = {
        isNativeApp: () => true,
        saveFile: (bytes,name,mime) => { window.__exported={bytes,name,mime}; }
      };
    });
    await page.evaluate(() => __qa.exportAllData());
    await page.waitForFunction(() => window.__exported);
    const exported = await page.evaluate(() => window.__exported);
    await page.evaluate(() => { delete window.AndroidBridge; __qa.streamImportPanel?.close(); });
    return JSON.parse(Buffer.from(exported.bytes,'base64').toString('utf8'));
  }
  async function importData(page, data) {
    await page.evaluate(data => {
      const file = new File([JSON.stringify(data)],'original-backup.json',{type:'application/json'});
      __qa.importAllData({target:{files:[file],value:'fixture'}});
    },data);
    await page.waitForFunction(() => __qa.globalConfirmModal.show || __qa.streamImportPanel?.state.phase === 'ready');
    await page.evaluate(() => __qa.streamImportPanel?.state.phase === 'ready' ? __qa.streamImportPanel.apply() : __qa.globalConfirmModal.onConfirm());
    await page.waitForEvent('load',{timeout:15000});
    await page.waitForFunction(() => window.__rpDataReady || !!document.getElementById('app')?.__vue_app__);
    await page.waitForTimeout(250);
    return page.evaluate(async () => {
      const s=RPHubStorage;
      await s.initDB();
      const binary=await s.getStoredValue('binary_attachment_fixture');
      return {
        characters:await s.getStoredValue('characters'),
        presets:await s.getStoredValue('presets'),
        presetGroups:await s.getStoredValue('preset_groups'),
        settings:await s.getStoredValue('settings'),
        user:await s.getStoredValue('user'),
        branches:await s.getScopedStoredValue('branches','backup-card-uuid'),
        main:await s.getScopedStoredValue('chat','backup-card-uuid'),
        branch:await s.getScopedStoredValue('chat','backup-card-uuid__branch__branch-two'),
        memory:await s.getScopedStoredValue('classic_memories','backup-card-uuid__branch__branch-two'),
        preference:localStorage.getItem('test-ui-preference'),
        freeze:localStorage.getItem('rphub-image-freeze::backup-card-uuid'),
        binaryBlob:binary?.file instanceof Blob,
        binaryBytes:binary?.file instanceof Blob ? [...new Uint8Array(await binary.file.arrayBuffer())] : [],
        binaryBuffer:binary?.buffer instanceof ArrayBuffer ? [...new Uint8Array(binary.buffer)] : []
      };
    });
  }
  function verify(data) {
    assert.equal(data.characters[0].uuid,'backup-card-uuid');
    assert.equal(data.characters[0].worldInfo[0].content,'世界书正文');
    assert.equal(data.characters[0].regexScripts[0].name,'私有正则');
    assert.equal(data.characters[0].uiTemplates[0].htmlTemplate,'<p>卡片 UI</p>');
    assert.equal(data.presets.find(item=>item.name==='原版自定义预设').content,'必须保留的预设正文');
    assert.deepEqual(data.presetGroups,['STA1N官方分组','测试组','备份中的空组']);
    assert.equal(data.settings.apiKey,'FAKE_TEST_KEY');
    assert.equal(data.user.name,'测试人设');
    assert.equal(data.branches.activeBranchId,'branch-two');
    assert.equal(data.main[0].content,'主线正文');
    assert.equal(data.branch[0].content,'分支正文');
    assert.equal(data.memory[0].summary,'分支总结');
    assert.equal(data.memory[0].embeddingQ,'AAAA');
    assert.equal(data.preference,'keep-this');
    assert.ok(data.freeze.includes('main-message'));
    assert.equal(data.binaryBlob,true);
    assert.deepEqual(data.binaryBytes,[1,2,3]);
    assert.deepEqual(data.binaryBuffer,[4,5,6]);
  }
  try {
    const original=await load(true);
    await seed(original);
    const originalBackup=await exportData(original);
    assert.equal(originalBackup.type,'rp-hub-complete-backup');
    assert.equal(originalBackup.version,8);
    if(originalVersion!=='2.8.80')assert.ok(originalBackup.entries.some(entry=>entry.key.startsWith('rp_hub_b1_memory_state_')));
    const current=await load();
    verify(await importData(current,originalBackup));
    await current.waitForFunction(() => window.__rpDataReady);
    await current.evaluate(() => { window.__qa=document.getElementById('app').__vue_app__._container._vnode.component.setupState; });
    const currentBackup=await exportData(current);
    const currentSettings=currentBackup.entries.find(entry=>entry.key==='rp_hub_settings').value;
    assert.equal(currentSettings.retainedCompatibilityField.keep,true);
    assert.ok(currentBackup.entries.some(entry=>entry.key.startsWith('rp_hub_b1_memory_state_')));
    assert.equal(currentBackup.type,'rp-hub-complete-backup');
    assert.equal(currentBackup.version,8);
    const originalRestore=await load(true);
    verify(await importData(originalRestore,currentBackup));
    if(originalVersion!=='2.8.80'){
      const state=await originalRestore.evaluate(async()=>({
        live:await RPHubStorage.readMemoryState('backup-card-uuid__branch__branch-two'),
        deleted:await RPHubStorage.readMemoryState('deleted-memory-scope')
      }));
      assert.equal(state.live.list[0].summary,'分支总结');
      assert.match(state.live.revision,/^[a-f0-9]{32}$/);
      assert.equal(state.deleted.list.length,0);
    }

    const sandbox={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(root,'web/assets/js/backup-format.js'),'utf8'),sandbox);
    const normalize=sandbox.window.RPBackupFormat.normalizePackage;
    for (const databases of [
      {RPHubDB:{store:[{k:'rp_hub_settings',v:{a:1}}]}},
      {main:{store:[{key:'rp_hub_settings',value:{a:1}}]}},
      {main:[{k:'rp_hub_settings',v:{a:1}}]},
      {SillyTavernDB:{store:{silly_tavern_settings:{a:1}}}}
    ]) assert.equal(normalize({__rphub_backup__:1,databases}).entries[0].key,'rp_hub_settings');
    assert.throws(()=>normalize({type:'rp-hub-complete-backup',entries:[{key:'missing'}]}));
    const deleted=normalize({type:'rp-hub-complete-backup',entries:[
      {key:'rp_hub_b1_memory_state_test',value:{schema:1,revision:'0'.repeat(32),deleted:true}},
      {key:'rp_hub_classic_memories_test',value:[{summary:'must not return'}]}
    ]});
    assert.equal(deleted.entries.length,1);
    assert.equal(deleted.entries[0].value.length,0);
    assert.throws(()=>normalize({type:'rp-hub-complete-backup',entries:[
      {key:'rp_hub_b1_memory_state_test',value:{schema:1,revision:'bad',deleted:false}}
    ]}));
    const report={originalVersion,originalExportExecuted:true,originalToLocalImport:true,localToOriginalImport:true,exportType:currentBackup.type,exportVersion:currentBackup.version,characterAndWorldbookAndRegexAndUi:true,branchesAndChatAndMemory:true,personasAndFakeKeysAndPresets:true,unrecognizedSettingsPreservedInLocalExport:true,blobAndArrayBufferRoundTrip:true,localStorageAndImageFreezeRecords:true,memoryTombstoneDoesNotResurrect:true,validMemoryRevisionOnReturn:originalVersion!=='2.8.80',pluginAndLegacyLayouts:4,invalidEntriesRejected:true,realPersonalDataUsed:false};
    fs.writeFileSync(path.join(root,'verification/'+(originalVersion!=='2.8.80'?`original-${originalVersion.split('.').at(-1)}-backup.json`:'original-backup.json')),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
