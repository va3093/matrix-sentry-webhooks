const client = require('./client');
const utils = require('./utils');
const data = require('./data');

const routes = {
    getRoot: (req, res) => {
        res.send('Hey 👋');
    },
    postEvents: (req, res) => {
        console.log(`Method:${req.method}\nURL: ${req.originalUrl}\nBody: ${JSON.stringify(req.body)}\nHeaders: ${JSON.stringify(req.headers)}`)
        let event;
        let project;
        if (req.headers['sentry-hook-signature'] !== undefined) {
            const issueData = data.getIssueData(req.body)
            if (!issueData) {
                return
            }
            // Integration Platform signed webhook
            // See https://docs.sentry.io/workflow/integrations/integration-platform/webhooks/
            if (!utils.verifySignature(req)) {
                console.warn('Rejected integration platform request without correct signature.');
                res.status(403).end();
                return;
            }
            console.log("\nREQUEST body:\n", JSON.stringify(req.body))
            console.log("\nextracted_payload:\n ", JSON.stringify(issueData))
            event = utils.formatIntegrationPlatformEvent(issueData);
            project = issueData.project
        } else {
            // Legacy webhook integration, requires token
            if (!utils.verifySecret(req)) {
                console.warn('Rejected legacy webhook request without correct secret.');
                res.status(403).end();
                return;
            }
            event = utils.formatLegacyWebhookEvent(req.body);
            project = req.body.project_slug;
        }

        if (!event) {
            console.warn('No event found in payload');
            res.json({});
            return;
        }

        const roomId = utils.getRoomForProject(project);

        if (!roomId) {
            console.warn(`No roomId mapping found for project ${project}`);
            res.json({});
            return;
        }

        console.log(`Sending event to room ${roomId}`);

        client.sendEvent(roomId, event);

        res.json({});
    },
};

module.exports = routes;
