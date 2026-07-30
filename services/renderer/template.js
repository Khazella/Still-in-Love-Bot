/**
 * Template loading, asset handling, and placeholder replacement.
 */

const fs = require('fs');
const path = require('path');

const {
    loadAsset
} = require('../asset-loader');

const {
    getRankIconFile
} = require('../report-utils');

/**
 * Read an HTML template file from the templates directory.
 *
 * @param {string} templateName - name of the template (without .html)
 * @returns {string} raw HTML content
 */
function loadTemplateHtml(templateName) {

    const templatePath = path.join(
        __dirname,
        '..',
        '..',
        'templates',
        `${templateName}.html`
    );

    return fs.readFileSync(
        templatePath,
        'utf8'
    );

}

/**
 * Load character icon, rank icon, and background image as
 * base64 data URIs based on the report data.
 *
 * @param {object} data - report data
 * @returns {{ airGrooveIcon: string, rankIcon: string, backgroundImage: string }}
 */
function resolveTemplateAssets(data) {

    const airGrooveIcon = loadAsset(
        'chr_icon_still_in_love.png'
    );

    const rankIcon = loadAsset(
        getRankIconFile(
            data.description || ''
        )
    );

    const isChrono =
        data.source === 'chronogenesis.net';

    const backgroundImage = loadAsset(
        isChrono
            ? 'backgrounds/Still_In_Love_Wallpaper.jpg'
            : 'backgrounds/Still_in_Love_aahn.jpg'
    );

    return {
        airGrooveIcon,
        rankIcon,
        backgroundImage
    };

}

/**
 * Replace asset placeholders (CHARACTER_ICON, RANK_ICON,
 * BACKGROUND_IMAGE) with the corresponding base64 data URIs.
 *
 * @param {string} html - template HTML
 * @param {{ airGrooveIcon: string, rankIcon: string, backgroundImage: string }} assets
 * @returns {string} HTML with placeholders replaced
 */
function replaceAssetPlaceholders(html, assets) {

    html = html.replace(
        '{{CHARACTER_ICON}}',
        assets.airGrooveIcon
    );

    html = html.replace(
        '{{RANK_ICON}}',
        assets.rankIcon
    );

    html = html.replace(
        '{{BACKGROUND_IMAGE}}',
        assets.backgroundImage
    );

    return html;

}

/**
 * Replace common informational placeholders (TITLE, DESCRIPTION,
 * FOOTER) with values from the report data.
 *
 * @param {string} html - template HTML
 * @param {object} data - report data
 * @returns {string} HTML with placeholders replaced
 */
function replaceCommonPlaceholders(html, data) {

    html = html.replace(
        '{{TITLE}}',
        data.title || ''
    );

    html = html.replace(
        '{{DESCRIPTION}}',
        (data.description || '')
            .replace(/\n/g, ' \u2022 ')
    );

    html = html.replace(
        '{{FOOTER}}',
        data.footer || ''
    );

    return html;

}

module.exports = {
    loadTemplateHtml,
    resolveTemplateAssets,
    replaceAssetPlaceholders,
    replaceCommonPlaceholders
};
