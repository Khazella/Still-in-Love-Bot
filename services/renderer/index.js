/**
 * Public API for the renderer module.
 *
 * Entry point: exports renderTemplate() for use by handlers.
 */

const logger = require('../logger');

const {
    screenshot
} = require('./puppeteer');

const {
    escapeHtml,
    safeNumber,
    safePercent
} = require('./utils');

const {
    getShameColor
} = require('./colors');

const {
    extractGoal,
    getCurrentGoal,
    getCurrentWeeklyGoal
} = require('../report-utils');

const {
    loadTemplateHtml,
    resolveTemplateAssets,
    replaceAssetPlaceholders,
    replaceCommonPlaceholders
} = require('./template');

const {
    renderScreenReport
} = require('./screen-report');

const {
    renderRows,
    renderFields
} = require('./rows');

const {
    renderLegacyBenchmark,
    renderBenchmarkV2
} = require('./benchmark');

async function renderTemplate(
    templateName,
    data
) {

    logger.render(`renderTemplate("${templateName}")`);

    let html = loadTemplateHtml(
        templateName
    );

    const assets = resolveTemplateAssets(
        data
    );

    html = replaceAssetPlaceholders(
        html,
        assets
    );

    if (templateName === 'screen-report') {

    html = renderScreenReport(
        html,
        data
    );

}

    const goal = extractGoal(
        data.description || ''
    );

    // Use the pre-computed currentGoal from the report
    // generator when available (club-report/weekly.js or
    // trainer/weekly.js). This ensures the expected progress
    // matches the exact daily quota and day-of-week for the
    // selected period, including the dynamic Week 4.
    // Falls back to report-utils functions for safety.
    const currentGoal =
        data.currentGoal ??
        (
            data.reportType === 'weekly'
                ? getCurrentWeeklyGoal(goal)
                : getCurrentGoal(goal)
        );

    const rowsHtml = renderRows(
        data.rows || [],
        goal,
        currentGoal,
        data.showShame
    );

    html = html.replace(
        '{{ROWS}}',
        rowsHtml
    );

    const fieldsHtml = renderFields(
        data
    );

    html = html.replace(
        '{{FIELDS}}',
        fieldsHtml
    );

    if (templateName !== 'benchmark') {

    html = renderLegacyBenchmark(
        html,
        data
    );

}

    if (templateName === 'benchmark' && data.current) {

    html = renderBenchmarkV2(
        html,
        data
    );

}

    html = replaceCommonPlaceholders(
        html,
        data
    );

    return await screenshot(
        html
    );

}

module.exports = {
    renderTemplate
};
