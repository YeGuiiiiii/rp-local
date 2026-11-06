const path = require('node:path');
const { build } = require('./ui-build/node_modules/esbuild');
const root = path.resolve(__dirname, '..');
(async () => {
    for (const name of ['worker', 'client']) await build({
        entryPoints: [path.join(__dirname, 'stream-import', name + '.mjs')],
        outfile: path.join(root, 'web/assets/js/stream-import' + (name === 'worker' ? '-worker' : '') + '.js'),
        nodePaths: [path.join(__dirname, 'ui-build/node_modules')],
        bundle: true, format: 'iife', target: ['chrome100'], legalComments: 'eof',
    });
})().catch(error => { console.error(error); process.exitCode = 1; });
