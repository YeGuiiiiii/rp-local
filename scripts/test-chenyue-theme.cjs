const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const installFileBridge = require('./mock-files.cjs');
const root = path.resolve(__dirname,'..'), web = path.join(root,'web');

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(installFileBridge);
  const page=await context.newPage();
  const errors=[], failedAssets=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!=='https://sta1n156.github.io')return route.abort();
    const relative=url.pathname.slice('/RP-Hub/'.length)||'index.html',file=path.resolve(web,relative);
    if(!file.startsWith(web+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      if(url.pathname.includes('/chenyue/'))failedAssets.push(url.pathname);
      return route.fulfill({status:404,body:''});
    }
    return route.fulfill({path:file,contentType:({'.js':'application/javascript','.html':'text/html','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream'});
  });
  const imageCheck=()=>page.evaluate(()=>[...document.querySelectorAll('img[src*="/chenyue/"]')]
    .filter(img=>img.getClientRects().length).every(img=>img.complete&&img.naturalWidth>0));
  try{
    await page.goto('https://sta1n156.github.io/RP-Hub/',{waitUntil:'load'});
    await page.waitForFunction(()=>window.__rpDataReady);
    await page.waitForFunction(()=>!document.querySelector('.entry-transition'));
    await page.evaluate(()=>{
      window.__qa=document.getElementById('app').__vue_app__._container._vnode.component.setupState;
      __qa.showUserSetupModal=false;
      __qa.isNavigationOpen=true;
    });
    const menu=page.getByRole('dialog',{name:'聊天菜单',exact:true});
    await menu.waitFor();
    await page.waitForTimeout(200);
    assert.equal(await imageCheck(),true);
    assert.equal(await menu.getByRole('button',{name:'当前角色世界书',exact:true}).isDisabled(),true);
    await page.screenshot({path:path.join(root,'verification/chenyue-menu-empty-390.png')});
    await menu.getByRole('button',{name:'设置',exact:true}).click();
    assert.equal(await page.evaluate(()=>__qa.currentView),'settings');
    const screenshots=[];
    for(const [width,height] of [[360,640],[390,844],[1280,900]]){
      await page.setViewportSize({width,height});
      for(const mode of ['day','night']){
        await page.evaluate(mode=>RPHubThemeKit.setScheme(mode),mode);
        await page.evaluate(()=>{__qa.currentView='chat';__qa.isNavigationOpen=true;});
        await menu.waitFor();
        await page.waitForTimeout(100);
        const geometry=await menu.evaluate(element=>{
          const rect=element.getBoundingClientRect();
          return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,screenW:innerWidth,screenH:innerHeight};
        });
        assert.ok(geometry.left>=0&&geometry.right<=geometry.screenW+1&&geometry.top>=0&&geometry.bottom<=geometry.screenH+1,JSON.stringify(geometry));
        const close=menu.getByRole('button',{name:'关闭聊天菜单',exact:true});
        await close.focus();await page.keyboard.press('Shift+Tab');
        assert.equal(await menu.getByRole('button',{name:'戳戳玥玥',exact:true}).evaluate(el=>el===document.activeElement),true);
        await page.keyboard.press('Shift+Tab');
        assert.equal(await menu.getByRole('button',{name:'设置',exact:true}).evaluate(el=>el===document.activeElement),true);
        const image=await menu.locator('.yy-menu-header img').boundingBox();
        const closeRect=await close.boundingBox();
        assert.ok(closeRect.width>=40&&closeRect.height>=40);
        assert.ok(image.width>=90);
        const name=`chenyue-menu-${mode}-${width}.png`;
        await page.evaluate(()=>document.activeElement?.blur());
        await page.screenshot({path:path.join(root,'verification',name)});
        screenshots.push(name);
        await close.click();
        assert.equal(await menu.count(),0);
      }
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{
      RPHubThemeKit.setScheme('day');
      __qa.characters=[{uuid:'chenyue-visual-test',name:'非常长的角色卡名称：玥玥与旅人们的幻想日常',description:'',first_mes:'',worldInfo:[],regexScripts:[],uiTemplates:[]}];
    });
    await page.evaluate(async()=>{await __qa.selectCharacter(0);__qa.isNavigationOpen=true;});
    await menu.waitFor();
    assert.equal(await menu.getByRole('button',{name:'当前角色世界书',exact:true}).isEnabled(),true);
    await menu.getByRole('button',{name:'当前角色正则',exact:true}).click();
    assert.equal(await page.evaluate(()=>__qa.currentView),'regex');
    for(const view of ['characters','album','advanced','settings','patchlist']){
      await page.evaluate(view=>{__qa.toasts=[];__qa.navigateWorkspace(view);},view);
      await page.waitForTimeout(300);
      assert.equal(await imageCheck(),true,'image decode for '+view);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,view);
      await page.screenshot({path:path.join(root,'verification',`chenyue-${view}-390.png`)});
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>__qa.navigateWorkspace('settings'));
    assert.equal(await page.getByRole('button',{name:'戳戳玥玥',exact:true}).count(),1);
    assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
    const report={mascotName:'陈玥 / 玥玥',generatedPanelAndButtonImagesLoaded:true,correctedCharacterImagesDecode:true,emptyAndLongCardMenu:true,realButtonNavigationPreserved:true,focusTrap:true,lightAndDark:true,screenshots,smallAndLargeScreens:true,failedAssets,errors};
    fs.writeFileSync(path.join(root,'verification/chenyue-theme.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
