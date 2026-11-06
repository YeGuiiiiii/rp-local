const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'verification/alignment-1.23/suite');
fs.mkdirSync(output, { recursive: true });
const jobs = fs.readdirSync(__dirname).filter(name => /^test-.*\.cjs$/.test(name) && name !== 'test-suite.cjs')
    .map(file => ({ file, args: file === 'test-original-backup.cjs' ? ['--118'] : [] }));
const results = [];
async function worker() {
    while (jobs.length) {
        const { file, args } = jobs.shift();
        const started = Date.now();
        const log = fs.createWriteStream(path.join(output, file.replace('.cjs', '.txt')));
        const code = await new Promise(resolve => {
            const child = spawn(process.execPath, [path.join(__dirname, file), ...args], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
            const timer = setTimeout(() => child.kill(), 240000);
            child.stdout.pipe(log, { end: false });
            child.stderr.pipe(log, { end: false });
            child.on('exit', code => { clearTimeout(timer); log.end(); resolve(code); });
        });
        results.push({ file, args, code, seconds: Math.round((Date.now() - started) / 1000) });
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
        console.log(`${code === 0 ? 'PASS' : 'FAIL'} ${file} (${results.at(-1).seconds}s)`);
    }
}
Promise.all([worker(), worker(), worker()]).then(() => {
    console.log(`${results.filter(item => item.code === 0).length}/${results.length} passed`);
    if (results.some(item => item.code !== 0)) process.exitCode = 1;
});
