const express = require('express');
const router = express.Router();
const {
  createCheckoutSession,
  handlePaymentSuccess,
  handlePaymentCancel,
  getPaymentStatus,
  handleWebhook,
  testStripeConnection
} = require('../controllers/paymentController');

// Middleware for webhook endpoint (raw body required)
const webhookMiddleware = express.raw({ type: 'application/json' });

// Create checkout session
router.post('/create-checkout-session', createCheckoutSession);

// Handle payment success
router.get('/success', handlePaymentSuccess);

// Handle payment cancellation
router.get('/cancel', handlePaymentCancel);

// Get payment status
router.get('/status/:sessionId', getPaymentStatus);

// Stripe webhook endpoint (must be before express.json() middleware)
router.post('/webhook', webhookMiddleware, handleWebhook);

// Test Stripe connection
router.get('/test-connection', testStripeConnection);

module.exports = router;
