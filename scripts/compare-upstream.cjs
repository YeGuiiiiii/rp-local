const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { parse } = require('./ui-build/node_modules/@babel/parser');

const root = path.resolve(__dirname, '..');
const reference = path.join(root, 'reference/original-2.8.118');
const output = path.join(root, 'verification/alignment-1.23');
fs.mkdirSync(output, { recursive: true });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const normalized = source => parse(source, { tokens: true }).tokens
    .filter(token => !String(token.type).includes('Comment') && token.type.label !== 'eof')
    .map(token => [token.type.label, token.value]);
function functions(source) {
    const result = new Map();
    function visit(node, parents = []) {
        if (!node || typeof node !== 'object') return;
        const name = node.type === 'VariableDeclarator' && node.id?.type === 'Identifier'
            && /FunctionExpression$/.test(node.init?.type) ? node.id.name
            : node.type === 'FunctionDeclaration' ? node.id?.name : null;
        if (name) {
            const body = source.slice(node.start, node.end);
            result.set([...parents, name].join('/'), { line: node.loc.start.line, body, hash: hash(JSON.stringify(normalized(body))) });
        }
        for (const [key, value] of Object.entries(node)) {
            if (['loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(key)) continue;
            if (Array.isArray(value)) value.forEach(child => visit(child, name ? [...parents, name] : parents));
            else if (value && typeof value === 'object') visit(value, name ? [...parents, name] : parents);
        }
    }
    visit(parse(source));
    return result;
}
const files = {};
for (const name of ['api-utils', 'app', 'built-in-content', 'cloud-backup', 'core-utils', 'data-services', 'runtime-services', 'ui-components']) {
    const original = path.join(reference, 'patched', name + '.js');
    const local = path.join(root, 'web/assets/js', name + '.js');
    const a = fs.readFileSync(original, 'utf8'), b = fs.readFileSync(local, 'utf8');
    const previous = functions(a), current = functions(b);
    const changed = [], missing = [], equal = [];
    for (const [key, value] of previous) {
        const target = current.get(key);
        if (!target) missing.push(key);
        else if (value.hash === target.hash) equal.push(key);
        else {
            changed.push({ name: key, upstreamLine: value.line, localLine: target.line });
            if (/memor|summary|extract|storybranch|persist|savechat/i.test(key)) {
                const slug = (name + '-' + key).replace(/[^a-z0-9_-]/gi, '_');
                fs.writeFileSync(path.join(output, slug + '-upstream.txt'), value.body);
                fs.writeFileSync(path.join(output, slug + '-local.txt'), target.body);
            }
        }
    }
    files[name] = { equalTokens: hash(JSON.stringify(normalized(a))) === hash(JSON.stringify(normalized(b))),
        equalFunctions: equal.length, changed, missing };
    try { execFileSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--', original, local], { stdio: 'pipe' }); }
    catch (error) { fs.writeFileSync(path.join(output, name + '.diff'), error.stdout); }
}
const patches = {};
for (const name of fs.readdirSync(path.join(root, 'web/assets/native'))) {
    const original = path.join(reference, 'apk-extracted/assets', name);
    if (!fs.existsSync(original)) continue;
    const a = fs.readFileSync(original, 'utf8'), b = fs.readFileSync(path.join(root, 'web/assets/native', name), 'utf8');
    patches[name] = { equalTokens: hash(JSON.stringify(normalized(a))) === hash(JSON.stringify(normalized(b))) };
    try { execFileSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--', original,
        path.join(root, 'web/assets/native', name)], { stdio: 'pipe' }); }
    catch (error) { fs.writeFileSync(path.join(output, 'native-' + name + '.diff'), error.stdout); }
}
fs.writeFileSync(path.join(output, 'comparison.json'), JSON.stringify({ files, patches }, null, 2));
console.log(JSON.stringify({
    modules: Object.fromEntries(Object.entries(files).map(([key, value]) => [key,
        { equal: value.equalTokens, unchanged: value.equalFunctions, changed: value.changed.length, missing: value.missing }])),
    memoryChanges: Object.fromEntries(Object.entries(files).map(([key, value]) => [key,
        value.changed.filter(item => /memor|summary|extract|storybranch|persist|savechat/i.test(item.name)).map(item => item.name)])),
    patches
}, null, 2));
