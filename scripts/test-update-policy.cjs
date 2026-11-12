const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = process.env.RP_BUILD_ALIAS || path.resolve(__dirname, '..'), output = path.join(root, 'verification/update-native');
fs.mkdirSync(output, { recursive: true });
const java = path.join(root, '.tools/java', fs.readdirSync(path.join(root, '.tools/java'))[0], 'bin/java.exe');
const source = path.join(root, 'native/com/rphub/app/UpdatePolicy.java');
assert.ok(fs.existsSync(source), 'Native updates need package and integrity validation');
const library = path.join(root, '.tools/json.jar');
const compile = spawnSync(java, ['-Djava.io.tmpdir=' + process.env.TEMP, '-jar', path.join(root, '.tools/ecj.jar'),
    '-encoding', 'UTF-8', '-source', '8', '-target', '8', '-classpath', library, '-d', output,
    source, path.join(root, 'tests/UpdatePolicyTest.java')], { encoding: 'utf8' });
assert.equal(compile.status, 0, compile.stdout + compile.stderr);
const test = spawnSync(java, ['-Djava.io.tmpdir=' + process.env.TEMP, '-cp', output + path.delimiter + library,
    'com.rphub.app.UpdatePolicyTest'], { encoding: 'utf8' });
assert.equal(test.status, 0, test.stdout + test.stderr);
console.log(test.stdout.trim());
