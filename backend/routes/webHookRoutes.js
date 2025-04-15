const express = require('express');
const router = express.Router();
const { handleStripeWebhook, handleHealthCheck } = require('../webhooks/stripeWebhooks');

// Le middleware raw doit être appliqué directement à la route
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);
router.get('/stripe', handleHealthCheck);

module.exports = router;