const debug = require('../util/debug').makeFileLogger(__filename);
let cache;
let hastily;
let missingDeps = '';
const markDepInvalid = (dep, e) => {
    missingDeps += `- ${dep}: Reason: ${e.message.split('\n')[0]}\n`;
};
try {
    cache = require('apicache').middleware;
} catch (e) {
    markDepInvalid('apicache', e);
}
try {
    hastily = require('hastily'); // eslint-disable-line
} catch (e) {
    markDepInvalid('hastily', e);
}

function addImgOptMiddleware(app, config) {
    const { cacheExpires, cacheDebug } = config;
    debug(`mounting onboard image optimization middleware "hastily"`);

    let cacheMiddleware;
    let imageopto;
    try {
        cacheMiddleware = cache(cacheExpires, hastily.hasSupportedExtension, {
            debug: cacheDebug
        });
    } catch (e) {
        markDepInvalid('apicache', e);
    }
    try {
        imageopto = hastily.imageopto();
    } catch (e) {
        markDepInvalid('hastily', e);
    }
    if (missingDeps) {
        console.warn(
            `Cannot add image optimization middleware due to dependencies that are not installed or are not compatible with this environment:
${missingDeps}
Images will be served uncompressed.

If possible, install additional tools to build NodeJS native dependencies:
https://github.com/nodejs/node-gyp#installation`
        );
    } else {
        app.use(cacheMiddleware, imageopto);
    }
}

module.exports = addImgOptMiddleware;
