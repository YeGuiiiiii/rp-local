import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { BackupStreamDecoder } from './decoder.mjs';

export async function* verifyChunks(chunks, piece) {
    const digest = sha256.create();
    let bytes = 0;
    for await (const chunk of chunks) {
        bytes += chunk.byteLength;
        if (bytes > piece.size) throw new Error('云端数据大小异常，原数据未改动');
        digest.update(chunk);
        yield chunk;
    }
    if (bytes !== piece.size || bytesToHex(digest.digest()) !== piece.hash)
        throw new Error('云端数据校验失败，原数据未改动，请重新上传备份');
}

export async function* decodeChat(chunks, limits) {
    const encoder = new TextEncoder(), pending = [];
    const parser = new BackupStreamDecoder({ maxUnitBytes: limits.unitBytes, emit(item) {
        if (item.kind === 'unit') pending.push(item.value);
        if (item.kind === 'record' && !item.array) throw new Error('云端聊天内容不完整');
    } });
    // Reuse the backup decoder's message limits and JSON validation with the old cloud array format.
    parser.write(encoder.encode('{"type":"rp-hub-complete-backup","entries":[{"key":"rp_hub_chat_cloud","value":'));
    for await (const chunk of chunks) {
        for (let offset = 0; offset < chunk.length; offset += limits.chunkBytes) {
            parser.write(chunk.subarray(offset, offset + limits.chunkBytes));
            while (pending.length) yield pending.shift();
        }
    }
    parser.write(encoder.encode('}]}'));
    parser.end();
}
