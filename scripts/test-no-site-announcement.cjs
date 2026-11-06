const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname,'..');
const web = path.join(root,'web');

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const reports=[];
  try {
    for(const marker of [null,'0','10224','99999999']) {
      const context=await browser.newContext({viewport:{width:390,height:844}});
      await context.addInitScript(installFileBridge);
      if(marker!==null) await context.addInitScript(marker=>{
        if(window.top===window)localStorage.setItem('roleplay_hub_update_id',marker);
      },marker);
      const page=await context.newPage();
      const errors=[], updateRequests=[];
      page.on('pageerror',error=>errors.push(error.message));
      await context.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(/\/v1\/version|announcement\.json|\/assets\/js\/update-check\.js/.test(url.href))updateRequests.push(url.href);
        if(url.origin!=='https://sta1n156.github.io')return route.abort();
        const relative=url.pathname.slice('/RP-Hub/'.length)||'index.html';
        const file=path.resolve(web,relative);
        if(!file.startsWith(web+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
        return route.fulfill({path:file,contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream'});
      });
      await page.goto('https://sta1n156.github.io/RP-Hub/',{waitUntil:'load'});
      await page.waitForFunction(()=>window.__rpDataReady);
      await page.waitForFunction(()=>!document.querySelector('.entry-transition'));
      assert.equal(await page.getByText('网站公告',{exact:true}).count(),0);
      assert.equal(await page.getByText('RP-Hub 2.0.5',{exact:true}).count(),0);
      await page.evaluate(()=>{
        window.dispatchEvent(new CustomEvent('rphub:update-available',{detail:{versionId:99999}}));
        document.dispatchEvent(new Event('visibilitychange'));
        window.__qa=document.getElementById('app').__vue_app__._container._vnode.component.setupState;
        __qa.showUserSetupModal=false;
        __qa.navigateWorkspace('patchlist');
      });
      await page.getByText(/^RP 本地版 \d+\.\d+ · 页面与功能随安装包更新。/).waitFor();
      assert.equal(await page.getByText('发现新版本',{exact:true}).count(),0);
      await page.waitForTimeout(250);
      assert.deepEqual(updateRequests,[]);
      assert.deepEqual(errors,[]);
      if(marker===null)await page.screenshot({path:path.join(root,'verification/local-about-390.png')});
      reports.push({readMarker:marker,siteAnnouncementAbsent:true,obsoleteRemoteEventIgnored:true,localAboutAvailable:true,updateRequests:0,pageErrors:0});
      await context.close();
    }
    fs.writeFileSync(path.join(root,'verification/no-site-announcement.json'),JSON.stringify(reports,null,2));
    console.log(JSON.stringify(reports,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
