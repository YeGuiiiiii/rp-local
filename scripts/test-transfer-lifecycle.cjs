const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const listeners = new Map();
const sandbox = {
    Vue: { ref: value => ({ value }), reactive: value => value,
        computed: read => ({ get value() { return read(); } }), watch() {}, onBeforeUnmount() {} },
    window: { RPThemePacks: { asset: () => '' },
        addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener() {} },
};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../web/assets/js/stream-import-ui.js'), 'utf8'), sandbox);
const task = {};
const panel = sandbox.window.RPStreamImportPanel.setup({ task });
const unload = () => {
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    listeners.get('beforeunload')(event);
    return event.prevented;
};
panel.state.phase = 'reading';
assert.equal(unload(), true, 'Browser navigation must still protect an unfinished import');
panel.state.phase = 'success';
assert.equal(unload(), false, 'A completed import must reload without asking to leave');
panel.state.phase = 'idle';
Object.assign(task, { active: true, locked: true, percent: 100 });
assert.equal(unload(), false, 'A completed ZIP import must reload without asking to leave');
Object.assign(task, { active: false, locked: false });
sandbox.window.AndroidBridge = { isNativeApp: () => true };
panel.state.phase = 'ready';
assert.equal(unload(), false, 'The Android app protects Back itself; native return must not open a leave dialog');
assert.equal(panel.handleBack(), true, 'Android Back must still be handled during confirmation');
assert.equal(panel.state.phase, 'ready', 'Android Back must not discard the prepared backup');
console.log('Import reload and Android return avoid the leave dialog; browser navigation and Back stay protected.');
