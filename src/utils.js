const crypto = require('crypto');
const data = require('./data');

const utils = {
    /**
     * Get the right roomId for the given project from MATRIX_ROOMS configuration item.
     * For is <project/roomId> separated by pipe for multiple project/rooms.
     */
    getRoomForProject: project => {
        const roomConfigs = process.env.MATRIX_ROOMS.split('|');
        let roomId = false;
        for (const config of roomConfigs) {
            const roomConfig = config.split('/');
            if (roomConfig[0] === project) {
                roomId = roomConfig[1];
                break;
            }
        }
        return roomId;
    },

    /**
     * Format payload into a message string.
     */
    formatIntegrationPlatformEvent: issueData => {
        console.warn('Formatting platform event');
        const { project, level, title, issueUrl, status, type } = issueData
        let parts = [];

        if (status === 'resolved') {
            parts.push(`<strong><span data-mx-color="#00FF00">✅ RESOLVED:</span></strong>`);
        }
        else if (['error', 'fatal'].includes(level)) {
            parts.push(`<strong><span data-mx-color="#ff0000"">☠️ ${level.toUpperCase()}:</span></strong>`);
        }
        else {
            parts.push(`<strong><span data-mx-color="#ff6e2d">${level.toUpperCase()}:</span></strong>`);
        }
        parts.push(project);
        parts.push('|');
        parts.push(`<a href="${issueUrl}">${title}</a>`);
        parts.push('|');
        parts.push(type);
        let final = parts.join(' ');
        console.log("\nConstructed html for message:\n ", final)
        return final
    },

    /**
     * Format payload into a message string.
     */
    formatLegacyWebhookEvent: data => {
        let parts = [];

        if (data.level === 'error') {
            parts.push('<strong><span data-mx-color="#ff0000">ERROR:</span></strong>');
        } else {
            parts.push(`<strong><span data-mx-color="#ff6e2d">${data.level.toUpperCase()}:</span></strong>`);
        }
        parts.push(data.project_name, '|');
        if (data.event.environment) {
            parts.push(`<span title="environment">${data.event.environment}</span>`, '|');
        }
        if (data.event.release) {
            parts.push(`<span title="release">${data.event.release}</span>`, '|');
        }
        parts.push(`<a href="${data.url}">${data.event.title || data.message}</a>`);
        if (data.event.request && data.event.request.url) {
            parts.push(`<br><b>url</b>: ${data.event.request.url}`);
            if (data.event.request.headers) {
                const referer = data.event.request.headers.filter(h => h[0] === 'Referer');
                if (referer) {
                    try {
                        parts.push(`referer ${referer[0][1]}</i>`);
                    } catch (e) {
                        parts.push(`referer ${JSON.stringify(referer)}</i>`);
                    }
                }
            }
        }
        if (data.event.contexts && data.event.contexts.browser) {
            parts.push(`<br><b>browser</b>: ${JSON.stringify(data.event.contexts.browser)}`);
        }
        if (data.event.culprit) {
            parts.push(`<br><b>culprit</b>: ${data.event.culprit}`);
        }
        const includeTags = (process.env.SENTRY_INCLUDE_TAGS || '').split(',');
        if (includeTags.length > 0) {
            for (const tag of includeTags) {
                const tagData = data.event.tags.filter(t => t[0] === tag);
                if (tagData.length > 0 && tagData[0].length > 1) {
                    parts.push(`<br><b>${tag}</b>: ${tagData[0][1]}`);
                }
            }
        }
        return parts.join(' ');
    },

    verifySignature: (request) => {
        const hmac = crypto.createHmac('sha256', process.env.SENTRY_CLIENT_SECRET);
        hmac.update(JSON.stringify(request.body), 'utf8');
        const digest = hmac.digest('hex');
        return digest === request.headers['sentry-hook-signature'];
    },

    verifySecret: (request) => {
        return request.query.secret === process.env.SENTRY_CLIENT_SECRET;
    },
};

module.exports = utils;
