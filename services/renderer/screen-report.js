/**
 * Screen report HTML generation (fan history + circle history).
 */

const {
    getShameColor
} = require('./colors');

/**
 * Render the screen-report specific HTML: fan history rows,
 * circle history entries, and replace their placeholders.
 *
 * @param {string} html - template HTML with placeholders
 * @param {object} data - report data
 * @returns {string} HTML with screen-report placeholders replaced
 */
function renderScreenReport(html, data) {

    const shameColor = getShameColor(
        data.shame_score ?? 0
    );

    const maxGain = Math.max(
        ...(data.fan_history || [])
            .map(x => x.monthly_gain || 0),
        1
    );

    const fanHistoryHtml =
        (data.fan_history || [])
            .map(month => {

                const progress =
                    (month.monthly_gain / maxGain) * 100;

                const monthName =
                    new Date(
                        month.year,
                        month.month - 1,
                        1
                    ).toLocaleString(
                        'en-US',
                        {
                            month: 'short'
                        }
                    );

                return `
                    <div class="fan-row">

                        <div class="fan-top">

                            <div class="fan-month">
                                ${monthName} ${month.year}
                            </div>

                            <div class="fan-gain">
                                ${(month.monthly_gain / 1000000).toFixed(2)}M
                            </div>

                        </div>

                        <div class="progress">
                            <div
                                class="fill"
                                style="
                                    width:${progress}%;
                                "
                            ></div>
                        </div>

                        <div class="fan-detail">
                            ${month.active_days} days \u2022
                            ${(month.avg_daily / 1000000).toFixed(2)}M/day
                        </div>

                    </div>
                `;
            })
            .join('');

    const groupedCircles = [];

    const sortedCircles =
        [...(data.circle_history || [])]
            .sort((a, b) => {
                const aKey =
                    a.year * 100 + a.month;

                const bKey =
                    b.year * 100 + b.month;

                return aKey - bKey;
            });

    for (const circle of sortedCircles) {

        const last =
            groupedCircles[
                groupedCircles.length - 1
            ];

        if (
            last &&
            last.circle_name === circle.circle_name
        ) {
            last.months++;
            last.end = circle;
        } else {
            groupedCircles.push({
                circle_name: circle.circle_name,
                start: circle,
                end: circle,
                months: 1
            });
        }
    }

    groupedCircles.reverse();

    const circleHistoryHtml =
        groupedCircles.map(
            (circle, index) => {

                const startDate =
                    new Date(
                        circle.start.year,
                        circle.start.month - 1,
                        1
                    );

                const endDate =
                    new Date(
                        circle.end.year,
                        circle.end.month - 1,
                        1
                    );

                const startText =
                    startDate.toLocaleString(
                        'en-US',
                        {
                            month: 'short',
                            year: 'numeric'
                        }
                    );

                const endText =
                    endDate.toLocaleString(
                        'en-US',
                        {
                            month: 'short',
                            year: 'numeric'
                        }
                    );

                return `
                    <div class="circle-entry">

                        <div class="circle-name">
                            ${circle.circle_name}
                            ${index === 0 ? '(Current)' : ''}
                        </div>

                        <div class="circle-range">
                            ${startText} - ${endText}
                            (${circle.months} month${circle.months > 1 ? 's' : ''})
                        </div>

                    </div>
                `;
            }
        ).join('');

    html = html.replace(
        '{{TRAINER_NAME}}',
        data.trainer_name || ''
    );

    html = html.replace(
        '{{TRAINER_ID}}',
        String(data.trainer_id || '')
    );

    html = html.replace(
        '{{CURRENT_CLUB}}',
        data.current_club || ''
    );

    html = html.replace(
        '{{SHAME_SCORE}}',
        `
            <span style="
                color:${shameColor};
            ">
                ${data.shame_score ?? 0}
            </span>
        `
    );

    html = html.replace(
        '{{FAN_HISTORY}}',
        fanHistoryHtml
    );

    html = html.replace(
        '{{CIRCLE_HISTORY}}',
        circleHistoryHtml
    );

    return html;

}

module.exports = {
    renderScreenReport
};
