const fs = require('fs');
const path = require('path');

function loadAsset(fileName) {

    const filePath = path.resolve(
        __dirname,
        '..',
        'assets',
        fileName
    );

    const ext = path.extname(fileName).toLowerCase();

    let mimeType = 'image/png';

    if (ext === '.jpg' || ext === '.jpeg') {
        mimeType = 'image/jpeg';
    } else if (ext === '.webp') {
        mimeType = 'image/webp';
    } else if (ext === '.gif') {
        mimeType = 'image/gif';
    }

    return (
        `data:${mimeType};base64,` +
        fs.readFileSync(filePath).toString('base64')
    );
}

module.exports = {
    loadAsset
};