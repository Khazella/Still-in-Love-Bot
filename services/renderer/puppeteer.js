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
