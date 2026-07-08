const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const {
    extractGoal,
    getCurrentGoal,
    getCurrentWeeklyGoal,
    getRankIconFile
} = require('./report-utils');

const {
    loadAsset
} = require('./asset-loader');

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));

}

function safeNumber(value, fallback = 0) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}

function safePercent(value) {

    return Math.max(
        0,
        Math.min(
            100,
            safeNumber(value)
        )
    );

}

function getShameColor(shame) {

    return shame >= 90
        ? '#ff4d4d'
        : shame >= 75
            ? '#ffd93d'
            : shame >= 40
                ? '#c77dff'
                : shame >= 1
                    ? '#7ee787'
                    : '#8f98ab';

}

async function renderTemplate(
    templateName,
    data
) {

    console.log('Renderer source:', data.source);

    const templatePath = path.join(
        __dirname,
        '..',
        'templates',
        `${templateName}.html`
    );

    let html = fs.readFileSync(
        templatePath,
        'utf8'
    );

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

    html = html.replace(
        '{{CHARACTER_ICON}}',
        airGrooveIcon
    );

    html = html.replace(
        '{{RANK_ICON}}',
        rankIcon
    );

    html = html.replace(
        '{{BACKGROUND_IMAGE}}',
        backgroundImage
    );

    if (templateName === 'screen-report') {

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
                            ${month.active_days} days •
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

    const shameColor = getShameColor(
        data.shame_score ?? 0
    );

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
}

    const goal = extractGoal(
        data.description || ''
    );

    const currentGoal =
        data.reportType === 'weekly'
            ? getCurrentWeeklyGoal(goal)
            : getCurrentGoal(goal);

    const rows = data.rows || [];

    const rowsHtml = rows.map(row => {

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

        return `
            <tr>

                <td class="rank">
                    #${row.rank}
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

                <td
                    class="shame"
                    style="
                        color:${shameColor};
                    "
                >
                    ${row.shame ?? 0}
                </td>

            </tr>
        `;
    }).join('');

    html = html.replace(
        '{{ROWS}}',
        rowsHtml
    );

    const fieldsHtml =
        Array.isArray(data.fields)
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

    html = html.replace(
        '{{FIELDS}}',
        fieldsHtml
    );

    const benchmarkRows =
        data.rows || [];

    const projectionRows =
        benchmarkRows
            .filter(row =>
                row.daily !== undefined
            )
            .map(row => `
                <tr>
                    <td>${row.section}</td>
                    <td>${row.daily}</td>
                    <td>${row.weekly}</td>
                    <td>${row.monthly}</td>
                </tr>
            `)
            .join('');

    html = html.replace(
        '{{BENCHMARK_PROJECTIONS}}',
        projectionRows
    );

    const weekRows =
        benchmarkRows
            .filter(row =>
                row.rank10 !== undefined
            )
            .map(row => `
                <tr>
                    <td>${row.section}</td>
                    <td>${row.rank10}</td>
                    <td>${row.rank30}</td>
                    <td>${row.rank100}</td>
                    <td>${row.rank500}</td>
                    <td>${row.rank1000}</td>
                    <td>${row.rank3000}</td>
                    <td>${row.rank5000}</td>
                </tr>
            `)
            .join('');

    html = html.replace(
        '{{BENCHMARK_WEEKS}}',
        weekRows
    );

    html = html.replace(
        '{{CHART_DATA}}',
        JSON.stringify(data.chart || [])
    );

    html = html.replace(
        '{{TITLE}}',
        data.title || ''
    );

    html = html.replace(
        '{{DESCRIPTION}}',
        (data.description || '')
            .replace(/\n/g, ' • ')
    );

    html = html.replace(
        '{{FOOTER}}',
        data.footer || ''
    );

    const browser =
    await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
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

        return await page.screenshot({
            type: 'png',
            fullPage: true
        });

    } finally {

        await browser.close();

    }
}

module.exports = {
    renderTemplate
};