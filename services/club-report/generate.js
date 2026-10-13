const logger = require('../logger');

const clubDb =
    require('../database/club');

const clubSettingsDb =
    require('../database/club-settings');

const weeklyFans =
    require('./weekly');

const monthlyFans =
    require('./monthly');

const {
    renderTemplate
} = require('../renderer');

// Source values used by the slash command option map to a human-readable
// data source label recorded on the fetched club data and shown in the report.
const SOURCE_LABELS = {
    uma: 'uma.moe',
    chrono: 'chronogenesis.net'
};

/**
 * Reusable Club Report generator.
 *
 * This is the SINGLE source of truth for building a Club Report, shared by:
 *   - the manual `/club-report` slash command (handlers/local.js)
 *   - the hourly automation (services/automation/club-report-automation.js)
 *
 * It performs exactly the same steps the manual command always performed:
 *   1. fetch the latest club snapshot for the requested source
 *   2. load the club settings/quota
 *   3. generate the weekly (or monthly) report
 *   4. render it to a PNG buffer via the `club` template
 *
 * The report calculation itself is unchanged — this module only extracts the
 * existing logic so both call paths cannot diverge.
 *
 * @param {object}  [params]
 * @param {string}  [params.club='First']    club name (e.g. 'First')
 * @param {string}  [params.period='current'] report period ('current', 'week1'..'week4', 'monthly')
 * @param {string}  [params.source='uma']     data source ('uma' or 'chrono')
 * @returns {Promise<{ report: object, imageBuffer: Buffer }>}
 */
async function generateClubReport({
    club = 'First',
    period = 'current',
    source = 'uma'
} = {}) {

    const latest =
        await clubDb.getLatestClubData(
            source
        );

    latest.source =
        SOURCE_LABELS[source] ||
        SOURCE_LABELS.uma;

    const settings =
        await clubSettingsDb.getClubSettings(
            club
        );

    // =========================
    // GENERATE REPORT
    // =========================

    const t1 = Date.now();

    const report =
        period === 'monthly'
            ? monthlyFans.generateMonthlyReport(
                latest,
                settings
            )
            : weeklyFans.generateWeeklyReport(
                latest,
                settings,
                period
            );

    const serviceName =
        period === 'monthly'
            ? 'club-report.generateMonthlyReport()'
            : 'club-report.generateWeeklyReport()';

    logger.service(serviceName, Date.now() - t1);

    // =========================
    // RENDER REPORT
    // =========================

    const t2 = Date.now();

    const imageBuffer =
        await renderTemplate(
            'club',
            report
        );

    logger.render('renderTemplate("club")', Date.now() - t2);

    return {
        report,
        imageBuffer
    };

}

module.exports = {
    generateClubReport
};
