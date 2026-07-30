/**
 * Table row rendering for club and trainer reports.
 * Generates progress bars, rank change indicators,
 * shame change indicators, and stat card fields.
 */

const {
    getShameColor
} = require('./colors');

/**
 * Render table rows with progress bars, rank changes,
 * and shame changes.
 *
 * @param {Array} rows - array of row objects
 * @param {number} goal - target fan count
 * @param {number} currentGoal - expected progress threshold
 * @param {boolean} showShame - whether to show shame column
 * @returns {string} HTML for all table rows
 */
function renderRows(rows, goal, currentGoal, showShame) {

    return rows.map(row => {

        const fansNumber = Number(
            String(row.fans)
                .replace(/,/g, '')
        );

        const progress = Math.min(
            100,
            (fansNumber / goal) * 100
        );

        const isBehind =
            fansNumber < currentGoal;

        const barColor = isBehind
            ? '#ff5d5d'
            : '#61b8ff';

        const shameColor = getShameColor(
            row.shame ?? 0
        );

        // =========================
        // RANK CHANGE
        // =========================

        const rankChange =
            Number(row.rankChange);

        let rankChangeHtml = '';

        if (
            Number.isFinite(rankChange) &&
            rankChange !== 0
        ) {

            if (rankChange > 0) {
                rankChangeHtml =
                    `<span class="rank-change-up">` +
                        `<span class="rank-arrow">▲</span>` +
                        `<span>${rankChange}</span>` +
                    `</span>`;
            } else if (rankChange < 0) {
                rankChangeHtml =
                    `<span class="rank-change-down">` +
                        `<span class="rank-arrow">▼</span>` +
                        `<span>${Math.abs(rankChange)}</span>` +
                    `</span>`;
            }

        }

        // =========================
        // SHAME CHANGE
        // =========================

        const shameChange =
            Number(row.shameChange);

        let shameChangeHtml = '';

        if (
            showShame &&
            Number.isFinite(shameChange) &&
            shameChange !== 0
        ) {

            if (shameChange > 0) {

                // Shame increased = bad
                shameChangeHtml =
                    `<span class="shame-change-up">` +
                        `<span class="shame-arrow">▲</span>` +
                        `<span>${shameChange}</span>` +
                    `</span>`;

            } else {

                // Shame decreased = good
                shameChangeHtml =
                    `<span class="shame-change-down">` +
                        `<span class="shame-arrow">▼</span>` +
                        `<span>${Math.abs(shameChange)}</span>` +
                    `</span>`;

            }

        }

        return `
            <tr>

                <td class="rank">
                    <span class="rank-number">
                        #${row.rank}
                    </span>
                    ${rankChangeHtml}
                </td>

                <td class="name">
                    ${row.name}
                </td>

                <td class="progress-cell">

                    <div style="
                        display:flex;
                        align-items:center;
                        gap:10px;
                    ">

                        <div class="progress">

                            <div
                                class="fill"
                                style="
                                    width:${progress}%;
                                    background:${barColor};
                                "
                            ></div>

                        </div>

                        <div style="
                            width:50px;
                            text-align:right;
                            font-weight:600;
                            color:${barColor};
                        ">
                            ${progress.toFixed(0)}%
                        </div>

                    </div>

                </td>

                <td class="fans">
                    ${row.fans}
                </td>

                <td class="daily">
                    ${row.daily}
                </td>

                ${
                    showShame
                        ? `
                            <td
                                class="shame"
                                style="
                                    color:${shameColor};
                                "
                            >
                                <span class="shame-number">
                                    ${row.shame ?? 0}
                                </span>

                                ${shameChangeHtml}
                            </td>
                        `
                        : ''
                }

            </tr>
        `;

    }).join('');

}

/**
 * Render stat card fields for the report.
 *
 * @param {object} data - report data (with optional fields array)
 * @returns {string} HTML for stat cards, or empty string
 */
function renderFields(data) {

    return Array.isArray(data.fields)
        ? data.fields.map(field => `
                <div class="stat-card">
                    <div class="stat-title">
                        ${field.name}
                    </div>

                    <div class="stat-value">
                        ${field.value}
                    </div>
                </div>
            `).join('')
        : '';

}

module.exports = {
    renderRows,
    renderFields
};
