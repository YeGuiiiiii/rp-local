const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ios = path.join(root, 'ios');
const site = path.join(ios, 'Resources/site');
const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const version = html.match(/RP_LOCAL_VERSION\s*=\s*'([\d.]+)'/)?.[1];
const release = html.match(/RP_LOCAL_RELEASE\s*=\s*(\d+)/)?.[1];
if (!version || !release) throw new Error('Missing web version');
// Only this generated directory is replaced; the Android web sources stay intact.
if (path.relative(ios, site) !== path.join('Resources', 'site')) throw new Error('Invalid staging directory');
fs.rmSync(site, { recursive: true, force: true });
fs.cpSync(path.join(root, 'web'), site, { recursive: true });
const edits = {
    'index.html': [
        [', interactive-widget=resizes-content', ''],
    ],
    'assets/js/image-download.js': [
        ['已提交保存到系统相册', '请在分享菜单中保存图片'],
    ],
    'assets/js/app.js': [
        ['下载 / RP本地版 / 数据备份', 'iPhone 文件分享菜单'],
        ['浏览器下载目录（由浏览器设置决定）', 'iPhone 文件分享菜单'],
        ['已保存到下载目录：', '请在分享菜单中保存：'],
        ['已保存到 下载 / RP本地版 / 数据备份', '已打开文件分享菜单'],
        ['默认备份文件夹', '应用内备份文件夹'],
    ],
};
for (const [name, replacements] of Object.entries(edits)) {
    const file = path.join(site, name);
    let content = fs.readFileSync(file, 'utf8');
    for (const [before, after] of replacements) content = content.replaceAll(before, after);
    fs.writeFileSync(file, content);
}
fs.writeFileSync(path.join(ios, 'Version.xcconfig'),
    `MARKETING_VERSION = ${version}\nCURRENT_PROJECT_VERSION = ${release}\n`);
fs.copyFileSync(path.join(root, 'dist/app-icon.png'), path.join(ios, 'Resources/icon-source.png'));
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(site, 'RP-Hub-LICENSE.txt'));
const assets = path.join(ios, 'Resources/Assets.xcassets');
fs.mkdirSync(path.join(assets, 'AppIcon.appiconset'), { recursive: true });
fs.writeFileSync(path.join(assets, 'Contents.json'), JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2));
fs.writeFileSync(path.join(assets, 'AppIcon.appiconset/Contents.json'), JSON.stringify({
    images: [{ idiom: 'universal', platform: 'ios', size: '1024x1024', filename: 'icon.png' }],
    info: { author: 'xcode', version: 1 },
}, null, 2));
console.log(`Prepared iOS ${version} (${release}): ${site}`);
