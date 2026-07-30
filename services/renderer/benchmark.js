/**
 * Benchmark HTML generation for both legacy and v2 formats.
 */

/**
 * Render the legacy benchmark section (used by Trainer
 * and Club reports that are NOT the benchmark template).
 * Generates projection rows and week-based ranking rows.
 *
 * @param {string} html - template HTML with benchmark placeholders
 * @param {object} data - report data
 * @returns {string} HTML with benchmark placeholders replaced
 */
function renderLegacyBenchmark(html, data) {

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

    return html;

}

/**
 * Render the new benchmark v2 section (used only by the
 * benchmark template with data.current).
 * Generates Top 10/30/100 projection rows.
 *
 * @param {string} html - template HTML with benchmark placeholders
 * @param {object} data - report data (must have data.current)
 * @returns {string} HTML with benchmark placeholders replaced
 */
function renderBenchmarkV2(html, data) {

    const projectionRows = [
        {
            section: 'Top 10',
            entry: data.current.top10.entry,
            average: data.current.top10.average
        },
        {
            section: 'Top 30',
            entry: data.current.top30.entry,
            average: data.current.top30.average
        },
        {
            section: 'Top 100',
            entry: data.current.top100.entry,
            average: data.current.top100.average
        }
    ]
    .map(row => `
        <tr>
            <td>${row.section}</td>
            <td>${Number(row.entry).toLocaleString()}</td>
            <td>${Number(row.average).toLocaleString()}</td>
        </tr>
    `)
    .join('');

    html = html.replace(
        '{{BENCHMARK_PROJECTIONS}}',
        projectionRows
    );

    html = html.replace(
        '{{BENCHMARK_CHART_DATA}}',
        JSON.stringify(data.chart || [], null, 2)
    );

    return html;

}

module.exports = {
    renderLegacyBenchmark,
    renderBenchmarkV2
};
