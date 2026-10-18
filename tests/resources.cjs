// Opcional: neste ambiente o Chromium não alcança as CDNs, mas curl alcança
// os mesmos destinos HTTPS autorizados. Repassa os bytes sem mudar a aplicação.
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fetch = promisify(execFile);
const cache = new Map();
module.exports = async function resources(page) {
    if (process.env.JUSTEC_RESOURCE_BRIDGE !== '1') return;
    await page.route(/^https:\/\/(cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//, async route => {
        try {
            const url = route.request().url();
            if (!cache.has(url)) cache.set(url, fetch('curl', ['--fail', '--location', '--silent', '--show-error', '--max-time', '25', url], { encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 }));
            const { stdout } = await cache.get(url);
            const kind = route.request().resourceType();
            await route.fulfill({ body: stdout, contentType: kind === 'script' ? 'application/javascript' : kind === 'stylesheet' ? 'text/css' : 'font/woff2' });
        } catch { await route.abort(); }
    });
};
