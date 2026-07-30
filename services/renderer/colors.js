/**
 * Color helpers for the renderer.
 */

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

module.exports = {
    getShameColor
};
