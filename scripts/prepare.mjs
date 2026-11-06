import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const assets = path.join(android, 'assets');
const web = path.join(root, 'web');
if (fs.existsSync(path.join(web, 'assets', 'js', 'local-files.js'))) {
  throw new Error('This is the original bootstrap script. It cannot overwrite the maintained local app. Use build.ps1.');
}
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const manifest = JSON.parse(read(path.join(assets, 'patch-manifest.json')));
const vendorNames = {
  'https://cdn.tailwindcss.com': 'tailwind.js',
  'https://unpkg.com/vue@3/dist/vue.global.prod.js': 'vue.global.prod.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js': 'marked.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js': 'purify.min.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js': 'sortable.min.js',
  'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js': 'localforage.min.js',
  'https://cdn.jsdelivr.net/npm/daisyui@4.7.2/dist/full.min.css': 'daisyui.min.css',
};
const nativeScripts = [
  'web-error-early.js', 'web-error-trap.js', 'rphub-embedding-cache.js',
  'rphub-image-vault.js', 'rphub-image-gallery.js', 'sakura-features.js',
  'rphub-native-theme.js', 'download-hook.js',
];
const patchStats = [];
for (const file of fs.readdirSync(path.join(assets, 'patch-seed'))) {
  let source = read(path.join(assets, 'patch-seed', file));
  let applied = 0;
  const missing = [];
  for (const [index, rule] of (manifest[file] || []).entries()) {
    const at = source.indexOf(rule.find);
    if (at >= 0) {
      source = source.slice(0, at) + rule.replace + source.slice(at + rule.find.length);
      applied++;
    } else if (!source.includes(rule.replace)) missing.push(index + 1);
  }
  patchStats.push({ file, applied, missing });
  let destination;
  if (file.endsWith('.html')) {
    destination = file === 'index.html' ? file : file.replace('-index.html', '/index.html');
    for (const [url, name] of Object.entries(vendorNames)) {
      source = source.replaceAll(url, `/RP-Hub/assets/vendor/${name}`);
    }
    source = source.replace(
      '<meta name="rphub-update-api" content="https://rphub-presence.zeabur.app">',
      '<meta name="rphub-update-api" content="">',
    );
    const scriptTags = nativeScripts.map(name => `<script src="/RP-Hub/assets/native/${name}"></script>`).join('\n    ');
    source = source.replace('<script src="/RP-Hub/assets/vendor/tailwind.js">', `${scriptTags}\n    <script src="/RP-Hub/assets/vendor/jszip.min.js"></script>\n    <script src="/RP-Hub/assets/vendor/tailwind.js">`);
    source = source.replace('启动加载官网最新页面，核心增强层随启动动态注入，不改动原版文件。', '页面与增强功能已随安装包内置，启动直接读取本地文件。');
    source = source.replace('>动态注入</span>', '>本地内置</span>');
    source = source.replace('if (el.__vue_app__) { return true; }', "if (typeof window.tailwind !== 'object') { return false; }\n            if (el.__vue_app__) { return true; }");
  } else destination = `assets/${file.endsWith('.css') ? 'css' : 'js'}/${file}`;
  write(path.join(web, destination), source);
}
fs.cpSync(path.join(assets, 'assets', 'vendor'), path.join(web, 'assets', 'vendor'), { recursive: true });
fs.mkdirSync(path.join(web, 'assets', 'native'), { recursive: true });
for (const name of nativeScripts) {
  fs.copyFileSync(path.join(assets, name), path.join(web, 'assets', 'native', name));
}
write(path.join(root, 'patch-baseline.json'), JSON.stringify(patchStats, null, 2));

function replaceMethod(file, declaration, body) {
  const source = read(file);
  const start = source.indexOf(`${declaration}\n`);
  if (start < 0) throw new Error(`Missing method: ${declaration}`);
  const end = source.indexOf('.end method', start) + '.end method'.length;
  write(file, source.slice(0, start) + `${declaration}\n${body}\n.end method` + source.slice(end));
}
const smali = path.join(android, 'smali', 'com', 'rphub', 'app');
const engine = path.join(smali, 'PatchEngine.smali');
let source = read(engine);
const original = '.method public static intercept(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;';
if (!source.includes('.method private static interceptRemote(')) {
  source = source.replace(`${original}\n`, '.method private static interceptRemote(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;\n');
  write(engine, source + `
${original}
    .locals 1
    invoke-static {p0, p1}, Lcom/rphub/app/LocalAssets;->intercept(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    move-result-object v0
    if-eqz v0, :remote
    return-object v0
    :remote
    invoke-static {p0, p1}, Lcom/rphub/app/PatchEngine;->interceptRemote(Landroid/content/Context;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    move-result-object v0
    return-object v0
.end method
`);
}
replaceMethod(engine, '.method public static declared-synchronized load(Landroid/content/Context;)V', '    .locals 0\n    return-void');
replaceMethod(engine, '.method private static scheduleRefresh(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)V', '    .locals 0\n    return-void');
replaceMethod(path.join(smali, 'OfficialUpdateWatcher.smali'), '.method public static checkOnColdStart(Landroid/app/Activity;Landroid/webkit/WebView;)V', '    .locals 0\n    return-void');

const activity = path.join(smali, 'MainActivity.smali');
source = read(activity);
source = source.replace('    invoke-virtual {v0, v1}, Landroid/webkit/WebSettings;->setForceDark(I)V\n', '');
write(activity, source);
replaceMethod(path.join(smali, 'MainActivity$7$1.smali'), '.method public run()V', `    .locals 3
    iget-object v0, p0, Lcom/rphub/app/MainActivity$7$1;->val$wv:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;
    move-result-object v1
    check-cast v1, Landroid/app/Activity;
    invoke-virtual {v0}, Landroid/webkit/WebView;->getParent()Landroid/view/ViewParent;
    move-result-object v2
    instance-of v2, v2, Landroid/view/ViewGroup;
    if-eqz v2, :destroy
    invoke-virtual {v0}, Landroid/webkit/WebView;->getParent()Landroid/view/ViewParent;
    move-result-object v2
    check-cast v2, Landroid/view/ViewGroup;
    invoke-virtual {v2, v0}, Landroid/view/ViewGroup;->removeView(Landroid/view/View;)V
    :destroy
    invoke-virtual {v0}, Landroid/webkit/WebView;->destroy()V
    invoke-virtual {v1}, Landroid/app/Activity;->recreate()V
    return-void`);

console.log(`Prepared ${patchStats.length} web files; native startup uses packaged assets.`);
