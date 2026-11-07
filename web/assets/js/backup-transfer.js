(function () {
    function* jsonParts(value, ancestors = new Set()) {
        if (typeof value === 'string') {
            yield '"';
            for (let offset = 0; offset < value.length; offset += 16384) yield JSON.stringify(value.slice(offset, offset + 16384)).slice(1, -1);
            yield '"';
        } else if (!value || typeof value !== 'object') {
            yield JSON.stringify(value) ?? 'null';
        } else {
            if (ancestors.has(value) || ancestors.size > 96) throw new Error('备份数据结构异常，未生成不完整备份');
            ancestors.add(value);
            if (typeof value.toJSON === 'function') yield* jsonParts(value.toJSON(), ancestors);
            else if (Array.isArray(value)) {
                yield '[';
                for (let i = 0; i < value.length; i++) { if (i) yield ','; yield* jsonParts(value[i], ancestors); }
                yield ']';
            } else {
                yield '{';
                let first = true;
                for (const key of Object.keys(value)) {
                    if (value[key] === undefined || typeof value[key] === 'function' || typeof value[key] === 'symbol') continue;
                    if (!first) yield ',';
                    first = false;
                    yield JSON.stringify(key) + ':';
                    yield* jsonParts(value[key], ancestors);
                }
                yield '}';
            }
            ancestors.delete(value);
        }
    }
    async function writeBackup({ entries, total, readCharacter, transform = item => item, write, progress = () => {},
        companions = () => ({}), webStorage = () => ({}) }) {
        const encoder = new TextEncoder();
        let buffer = '', written = 0, done = 0, count = 0;
        const report = () => progress({ percent: total ? Math.min(99, done / total * 99) : 0,
            done, total, bytes: written, message: '正在导出备份' });
        const flush = async () => {
            if (!buffer) return;
            const text = buffer; buffer = '';
            await write(text);
            written += encoder.encode(text).byteLength;
            report();
            await new Promise(resolve => setTimeout(resolve, 0));
        };
        const append = async text => {
            while (text.length) {
                const size = Math.min(65536 - buffer.length, text.length);
                buffer += text.slice(0, size);
                text = text.slice(size);
                if (buffer.length === 65536) {
                    const tail = buffer.charCodeAt(buffer.length - 1);
                    const carry = tail >= 0xd800 && tail <= 0xdbff ? buffer.slice(-1) : '';
                    if (carry) buffer = buffer.slice(0, -1);
                    await flush();
                    buffer = carry;
                }
            }
        };
        const value = async (item, prepare = value => value) => {
            const encoded = window.RPBackupFormat.hasBinary(item) ? await window.RPBackupFormat.encodeBinary(item) : item;
            for (const part of jsonParts(prepare(encoded))) await append(part);
        };
        await append('{"type":"rp-hub-complete-backup","__rphub_backup__":1,"version":8,"exportedAt":');
        await value(new Date().toISOString());
        await append(',"entries":[');
        for await (const entry of entries) {
            if (count++) await append(',');
            await append('{"key":'); await value(entry.key); await append(',"value":');
            if (entry.value?.rphubCardLibrary === 1) {
                await append('[');
                for (const [index, card] of entry.value.cards.entries()) {
                    if (index) await append(',');
                    const full = await readCharacter(card);
                    await value(full, encoded => transform({ key: entry.key, value: [encoded] }).value[0]);
                }
                await append(']');
            } else await value(entry.value, encoded => transform({ key: entry.key, value: encoded }).value);
            await append('}');
            done++; report();
        }
        await append('],"databases":'); await value(await companions());
        await append(',"webStorage":{"localStorage":'); await value(await webStorage());
        await append('}}'); await flush();
        progress({ percent: 100, done, total, bytes: written, message: '备份已写完' });
        return { count, bytes: written };
    }
    window.RPBackupTransfer = Object.freeze({ writeBackup });
})();
