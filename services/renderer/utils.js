/**
 * Utility functions for the renderer.
 * Pure, stateless helpers with no side effects.
 */

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

module.exports = {
    escapeHtml,
    safeNumber,
    safePercent
};
