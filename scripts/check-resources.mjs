import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'web');
// 基线包被 .gitignore 排除，仓库里通常没有。缺失时跳过基线比对（该比对默认不阻断退出码）。
const baselinePath = path.join(root, 'dist', 'RP-local-0.3.apk');
let baseline = null;
if (fs.existsSync(baselinePath)) {
    let JSZip = null;
    for (const candidate of ['jszip', 'C:/Users/pzh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/jszip']) {
        try { JSZip = require(candidate); break; } catch { /* 换下一个候选 */ }
    }
    if (JSZip) baseline = await JSZip.loadAsync(fs.readFileSync(baselinePath));
    else console.error('! 存在 dist/RP-local-0.3.apk 但缺少 jszip 依赖，跳过基线比对');
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = fs.readdirSync(web, { recursive: true }).filter(name => fs.statSync(path.join(web, name)).isFile());
const errors = [];
const baselineDifferences = [];
let scripts = 0;
let unchangedScripts = 0;
let references = 0;
for (const name of files) {
    if (/\.(woff2?|ttf|otf|original|map)$/i.test(name)) errors.push('Build-only or font file: ' + name);
    const file = path.join(web, name);
    const text = fs.readFileSync(file, 'utf8');
    if (name.endsWith('.js')) {
        try { new vm.Script(text, { filename: name }); scripts++; }
        catch (error) { errors.push(error.message); }
        if (baseline) {
            const old = baseline.file('assets/local-site/' + name.replaceAll('\\', '/'));
            if (!old || hash(await old.async('nodebuffer')) !== hash(fs.readFileSync(file))) {
                baselineDifferences.push(name);
            } else unchangedScripts++;
        }
    }
    if (name.startsWith('assets' + path.sep + 'css' + path.sep) && name.endsWith('.css')) {
        for (const [, value] of text.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
            if (/^(?:data:|https?:|#)/.test(value)) continue;
            if (!fs.existsSync(path.resolve(path.dirname(file), value))) errors.push('Missing CSS resource: ' + name + ' -> ' + value);
            references++;
        }
    }
    if (!name.endsWith('.html')) continue;
    const inlineScripts = html => [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(match => match[1]);
    for (const script of inlineScripts(text)) {
        if (!script.trim()) continue;
        try { new vm.Script(script, { filename: name }); scripts++; }
        catch (error) { errors.push(error.message); }
    }
    if (baseline) {
        const old = baseline.file('assets/local-site/' + name.replaceAll('\\', '/'));
        if (!old || JSON.stringify(inlineScripts(await old.async('string'))) !== JSON.stringify(inlineScripts(text))) {
            baselineDifferences.push(name);
        }
    }
    const markup = text.replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1</script>');
    for (const match of markup.matchAll(/<(?:script|link|img)\b[^>]*?(?<![:\w-])(?:src|href)="([^"]+)"/gi)) {
        const value = match[1];
        if (/fonts\.(?:googleapis|gstatic)\.com|\/assets\/fonts\//.test(value)) errors.push('Obsolete font reference: ' + value);
        if (/^(?:https?:|data:|blob:|#)/.test(value) || value.includes('${')) continue;
        const pathname = new URL(value, 'https://local.test/RP-Hub/' + name.replaceAll('\\', '/')).pathname;
        const target = path.resolve(web, pathname.slice('/RP-Hub/'.length));
        if (!pathname.startsWith('/RP-Hub/') || !target.startsWith(web + path.sep) || !fs.existsSync(target)) {
            errors.push('Missing local reference: ' + name + ' -> ' + value);
        }
        references++;
    }
}
const aliases = [];
for (const name of ['MainActivity.smali', 'PatchEngine.smali']) {
    const source = fs.readFileSync(path.join(root, 'android', 'smali', 'com', 'rphub', 'app', name), 'utf8');
    for (const [, relative] of source.matchAll(/"local-site\/([^"]+)"/g)) {
        if (!fs.existsSync(path.join(web, relative))) errors.push('Missing native resource: ' + relative);
        aliases.push(relative);
    }
}
const report = {
    webFiles: files.length,
    webBytes: files.reduce((total, name) => total + fs.statSync(path.join(web, name)).size, 0),
    bundledFonts: files.filter(name => /\.(woff2?|ttf|otf)$/i.test(name)).length,
    parsedScripts: scripts, unchangedRuntimeScripts: unchangedScripts,
    checkedLocalReferences: references, checkedNativeAliases: aliases.length,
    inlineScriptsAndPromptsUnchanged: !baselineDifferences.some(name => name.endsWith('.html')),
    baselineDifferences, errors,
};
fs.writeFileSync(path.join(root, 'verification', 'resources.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (errors.length || (process.argv.includes('--preserve-runtime') && baselineDifferences.length)) process.exitCode = 1;
