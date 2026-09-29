/**
 * Browser launch, page setup, and screenshot generation.
 */

const logger = require('../logger');

const puppeteer = require('puppeteer-core');

/**
 * Launch a headless Chromium browser, render the HTML,
 * and return a PNG screenshot buffer.
 *
 * Preserves all Puppeteer options from the original
 * renderer (viewport 1200x100 at 2x DPR, full page,
 * networkidle0 wait).
 *
 * @param {string} html - fully rendered HTML page
 * @returns {Promise<Buffer>} PNG screenshot buffer
 */
async function screenshot(html) {

    const browser =
        await puppeteer.launch({
            executablePath:
                '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

    try {

        const page =
            await browser.newPage();

        await page.setViewport({
            width: 1200,
            height: 100,
            deviceScaleFactor: 2
        });

        await page.setContent(
            html,
            {
                waitUntil:
                    'networkidle0'
            }
        );

        // Chart templates set window.__chartReady = false before the
        // chart is created and true once Chart.js has finished its
        // first draw. Wait for that signal so the screenshot is taken
        // after the chart has fully rendered. Templates that never set
        // the flag resolve immediately, and the timeout keeps the
        // command from hanging if rendering never completes.
        await page
            .waitForFunction(
                () => window.__chartReady !== false,
                { timeout: 5000, polling: 100 }
            )
            .catch(() => {});

        const buffer = await page.screenshot({
            type: 'png',
            fullPage: true
        });

        logger.puppeteer('Screenshot generated');

        return buffer;

    } finally {

        await browser.close();

    }

}

module.exports = {
    screenshot
};
