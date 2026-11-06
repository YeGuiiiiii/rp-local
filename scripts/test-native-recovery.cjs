const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.join(process.env.USERPROFILE, '.cache/rphub-local-build');
const java = path.join(root, '.tools/java', fs.readdirSync(path.join(root, '.tools/java'))[0], 'bin/java.exe');
const output = path.join(root, '.tools/native-recovery-test');
fs.mkdirSync(output, { recursive: true });
const library = path.join(root, '.tools/android.jar');
const compile = spawnSync(java, ['-jar', path.join(root, '.tools/ecj.jar'), '-encoding', 'UTF-8',
    '-source', '8', '-target', '8', '-classpath', library, '-d', output,
    path.join(root, 'native/com/rphub/app/RenderRecovery.java'), path.join(root, 'tests/RenderRecoveryTest.java')], { encoding: 'utf8' });
assert.equal(compile.status, 0, compile.stdout + compile.stderr);
const test = spawnSync(java, ['-cp', output + path.delimiter + library, 'com.rphub.app.RenderRecoveryTest'], { encoding: 'utf8' });
assert.equal(test.status, 0, test.stdout + test.stderr);
console.log(test.stdout.trim());
