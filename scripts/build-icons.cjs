const fs = require('node:fs');
const path = require('node:path');
const lucide = require('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/lucide');
const names = ['Users', 'Images', 'SlidersHorizontal', 'UserRound', 'Globe2', 'X', 'ChevronLeft', 'ChevronRight', 'ChevronDown', 'ChevronUp', 'ArrowLeft', 'ArrowUpRight', 'Search', 'Plus', 'Trash2', 'Download', 'Upload', 'Heart', 'BookOpen', 'Wand2', 'Settings2', 'KeyRound', 'Image', 'HardDrive', 'Database', 'Palette', 'Info', 'ChartNoAxesCombined', 'Brain', 'Code2', 'PanelsTopLeft', 'Wrench', 'Dices', 'FileSearch', 'CircleHelp', 'RefreshCw', 'MoreHorizontal', 'Expand', 'Grid2X2', 'Check', 'FolderOpen', 'NotebookPen', 'Save'];
const icons = Object.fromEntries([...names, 'Sun', 'Moon'].map(name => {
  if (!lucide.icons[name]) throw new Error('Unknown Lucide icon: ' + name);
  return [name, lucide.icons[name]];
}));
icons.Lighthouse = [
  ['path', { d: 'm9 10-2 11h10l-2-11M9 16h6M6 21h12' }],
  ['path', { d: 'M9 10V6h6v4ZM8 6l4-3 4 3M12 3V2' }],
  ['path', { d: 'm2 5 3 2-3 2m20-4-3 2 3 2' }]
];
fs.writeFileSync(path.resolve(__dirname, '../web/assets/js/shell-icons.js'),
  '/* Lucide icons (ISC) and the local Lighthouse symbol. */\nwindow.RPShellIcons = ' + JSON.stringify(icons) + ';\n');
fs.copyFileSync(require.resolve('C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/lucide/LICENSE'), path.resolve(__dirname, '../android/assets/LUCIDE-LICENSE.txt'));
console.log('Bundled ' + Object.keys(icons).length + ' icons.');
