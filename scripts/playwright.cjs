const configuredPath = process.env.RPHUB_PLAYWRIGHT_PATH || process.env.PLAYWRIGHT_MODULE;

if (configuredPath) {
    module.exports = require(configuredPath);
} else {
    try {
        module.exports = require('playwright');
    } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND' || !String(error.message).includes("'playwright'")) throw error;
        throw new Error('Playwright is not installed. Run npm install --no-save playwright or set RPHUB_PLAYWRIGHT_PATH.');
    }
}
