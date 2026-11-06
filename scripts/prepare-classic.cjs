const fs = require('node:fs');
const path = require('node:path');
const { parse, parseFragment, serialize } = require('./ui-build/node_modules/parse5');
const root = path.resolve(__dirname, '..');
const find = (node, test) => test(node) ? node
    : (node.childNodes || []).map(child => find(child, test)).find(Boolean);
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const parseApp = file => find(parse(fs.readFileSync(file, 'utf8')), node => attr(node, 'id') === 'app');
const original = parseApp(path.join(root, 'reference/original-2.8.118/patched/index.html'));
const current = parseApp(path.join(root, 'web/index.html'));
const originalMain = find(original, node => attr(node, 'class')?.split(' ').includes('app-main'));
const currentMain = find(current, node => attr(node, 'class')?.split(' ').includes('app-main'));
const view = (node, name) => find(node, item =>
    [attr(item, 'v-if'), attr(item, 'v-show')].includes(`currentView === '${name}'`));
function replace(target, source) {
    if (!target || !source) throw new Error('Classic layout adaptation target missing');
    const parent = target.parentNode;
    parent.childNodes.splice(parent.childNodes.indexOf(target), 1, source);
    source.parentNode = parent;
}
function append(parent, markup) {
    for (const node of parseFragment(markup).childNodes) {
        node.parentNode = parent;
        parent.childNodes.push(node);
    }
}
// Preserve the upstream layout; the local file/import and scoped-list controls use the shared implementation.
for (const name of ['backup', 'presets', 'regex', 'worldinfo', 'generator', 'square', 'novel', 'lighthouse']) {
    replace(view(originalMain, name), view(currentMain, name));
}
for (const name of ['settings-detail', 'cache', 'album', 'advanced', 'competition']) {
    const node = name === 'competition'
        ? find(currentMain, item => item.tagName === 'competition-detail') : view(currentMain, name);
    if (!node) throw new Error('Missing local view: ' + name);
    node.parentNode = originalMain;
    originalMain.childNodes.push(node);
}
const settings = view(originalMain, 'settings');
const stack = find(settings, node => attr(node, 'class') === 'settings-stack');
append(stack, `<section class="settings-card"><h3 class="settings-card__title">外观</h3>
    <button type="button" class="settings-action" @click="openSettingsSection('appearance')">界面主题</button></section>`);
const about = view(originalMain, 'patchlist');
const aboutItems = find(about, node => node.tagName === 'ol').childNodes.filter(node => node.tagName === 'li');
aboutItems[0].childNodes[0].value = '页面与补丁随安装包内置，按 RP-Hub 2.8.118 对照维护。';
aboutItems.at(-1).childNodes[0].value = '更新公告：使用本地版公告，首次安装或更新后展示一次。设置 → 外观 → 界面主题可切换经典、白昼手账和夜蔷薇。';
append(about, `<div class="classic-local-links"><button type="button" class="settings-action" @click="openAnnouncement">查看更新公告</button>
    <button type="button" class="settings-action" @click="openSettingsSection('appearance')">外观</button></div>`);
const cardView = view(originalMain, 'characters');
view(originalMain, 'chat').attrs.push({ name: 'v-if', value: 'hasOpenedChat' });
function visit(node, callback) {
    callback(node);
    (node.childNodes || []).forEach(child => visit(child, callback));
}
visit(cardView, node => {
    if (node.tagName === 'character-card') node.attrs.push({ name: '@memories', value: 'openCharacterMemories(char.originalIndex)' });
    if (node.tagName === 'character-deck') node.attrs.push({ name: '@memories', value: 'openCharacterMemories' });
});
visit(originalMain, node => {
    if (node.tagName === 'settings-page-header' && attr(node, '@menu') === 'toggleNavigation') {
        node.attrs.push({ name: ':classic', value: 'true' });
    }
});
const scope = find(currentMain, node => attr(node, 'class')?.includes('workspace-context'));
scope.attrs.find(item => item.name === 'v-if').value = "['worldinfo','regex'].includes(currentView)";
scope.parentNode = originalMain;
originalMain.childNodes.unshift(scope);
// Reuse the current dialogs, including our announcement and version-safe role memory editor.
const main = find(current, node => attr(node, 'class')?.split(' ').includes('app-main'));
replace(main, originalMain);
current.childNodes = current.childNodes.filter(node =>
    !['shell-chat-menu', 'shell-dock'].includes(node.tagName));
const navigation = find(original, node => node.tagName === 'app-navigation');
navigation.attrs.find(item => item.name === '@update:current-view').value = 'navigateWorkspace($event)';
navigation.parentNode = current;
current.childNodes.unshift(navigation);
const directory = path.join(root, 'web/assets/themes/classic');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'layout.html'),
    '<!-- Generated from the user-provided RP-Hub 2.8.118 APK by scripts/prepare-classic.cjs. Shared data and local dialogs are retained. -->\n'
    + serialize(current));
console.log('Prepared the actual 2.8.118 layout with shared local storage/import controls and announcement.');
