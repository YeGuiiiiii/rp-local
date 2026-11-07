const MB = 1048576;
export const profiles = Object.freeze([
    { id: 'light', name: '省内存', chunkBytes: 65536, unitBytes: 16 * MB, collectionBytes: 64 * MB },
    { id: 'balanced', name: '均衡', chunkBytes: 262144, unitBytes: 32 * MB, collectionBytes: 128 * MB },
    { id: 'fast', name: '高速', chunkBytes: MB, unitBytes: 64 * MB, collectionBytes: 256 * MB }
]);
export const profile = id => profiles.find(item => item.id === id) || profiles[1];
