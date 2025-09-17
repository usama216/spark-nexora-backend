const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Debug: Log the Stripe key (first 10 characters only for security)
console.log('Stripe Secret Key (first 10 chars):', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'NOT FOUND');
const Payment = require('../models/Payment');
const Order = require('../models/Order');

// Create Stripe checkout session
const createCheckoutSession = async (req, res) => {
  try {
    const { 
      packageName, 
      packagePrice, 
      customerEmail, 
      customerName,
      customerPhone,
      billingAddress 
    } = req.body;

    // Validate required fields
    if (!packageName || !packagePrice || !customerEmail || !customerName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: packageName, packagePrice, customerEmail, customerName'
      });
    }

    // Convert price to cents for Stripe
    const amountInCents = Math.round(packagePrice * 100);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: packageName,
              description: `Digital Marketing Package - ${packageName}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      customer_email: customerEmail,
      metadata: {
        packageName,
        packagePrice: packagePrice.toString(),
        customerName,
        customerPhone: customerPhone || '',
        billingAddress: billingAddress ? JSON.stringify(billingAddress) : ''
      },
      // Add customer information
      customer_creation: 'always',
      billing_address_collection: 'required',
    });

    // Create payment record in database
    const payment = new Payment({
      paymentIntentId: session.payment_intent || `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      customerEmail,
      customerName,
      packageName,
      packagePrice,
      amount: amountInCents,
      status: 'pending',
      metadata: {
        packageName,
        packagePrice,
        customerPhone: customerPhone || '',
        billingAddress: billingAddress || {}
      }
    });

    await payment.save();

    res.json({
      success: true,
      message: 'Checkout session created successfully',
      data: {
        sessionId: session.id,
        url: session.url
      }
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message
    });
  }
};

// Handle successful payment
const handlePaymentSuccess = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Find the payment record
    const payment = await Payment.findOne({ sessionId: session_id });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    // Check if payment is already processed (idempotency check)
    if (payment.status === 'succeeded') {
      // Find existing order for this payment
      const existingOrder = await Order.findOne({ paymentId: payment._id });
      
      if (existingOrder) {
        // Return existing data without creating new order
        return res.json({
          success: true,
          message: 'Payment already processed successfully',
          data: {
            payment: {
              id: payment._id,
              status: payment.status,
              packageName: payment.packageName,
              packagePrice: payment.packagePrice,
              customerEmail: payment.customerEmail,
              customerName: payment.customerName,
              paidAt: payment.paidAt,
              createdAt: payment.createdAt
            },
            order: {
              id: existingOrder._id,
              orderNumber: existingOrder.orderNumber,
              status: existingOrder.status,
              packageName: existingOrder.packageName,
              packagePrice: existingOrder.packagePrice,
              customerEmail: existingOrder.customerEmail,
              customerName: existingOrder.customerName,
              serviceStartDate: existingOrder.serviceStartDate,
              serviceEndDate: existingOrder.serviceEndDate,
              createdAt: existingOrder.createdAt
            }
          }
        });
      }
    }

    // Update payment status only if not already succeeded
    if (payment.status !== 'succeeded') {
      payment.status = 'succeeded';
      payment.paidAt = new Date();
      payment.chargeId = session.payment_intent;
      payment.webhookProcessed = true;

      await payment.save();
    }

    // Check if order already exists for this payment
    let order = await Order.findOne({ paymentId: payment._id });
    
    if (!order) {
      // Generate order number first
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // Get count of orders for today
      const todayStart = new Date(year, date.getMonth(), date.getDate());
      const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);
      
      const count = await Order.countDocuments({
        createdAt: { $gte: todayStart, $lt: todayEnd }
      });
      
      // Format: SN-YYYYMMDD-XXXX
      const orderNumber = `SN-${year}${month}${day}-${String(count + 1).padStart(4, '0')}`;

      // Create order record
      order = new Order({
        orderNumber: orderNumber,
        customerEmail: payment.customerEmail,
        customerName: payment.customerName,
        packageName: payment.packageName,
        packagePrice: payment.packagePrice,
        paymentId: payment._id,
        status: 'paid',
        serviceStartDate: new Date(),
        // For monthly packages, set end date to 30 days from now
        serviceEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: `Payment completed via Stripe. Session ID: ${session_id}`
      });

      // Add billing address if available
      if (session.metadata && session.metadata.billingAddress) {
        try {
          order.billingAddress = JSON.parse(session.metadata.billingAddress);
        } catch (e) {
          console.error('Error parsing billing address:', e);
        }
      }

      await order.save();
    }

    res.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        payment: {
          id: payment._id,
          status: payment.status,
          packageName: payment.packageName,
          packagePrice: payment.packagePrice,
          customerEmail: payment.customerEmail,
          customerName: payment.customerName,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt
        },
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          packageName: order.packageName,
          packagePrice: order.packagePrice,
          customerEmail: order.customerEmail,
          customerName: order.customerName,
          serviceStartDate: order.serviceStartDate,
          serviceEndDate: order.serviceEndDate,
          createdAt: order.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error handling payment success:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment success',
      error: error.message
    });
  }
};

// Handle payment cancellation
const handlePaymentCancel = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (session_id) {
      // Find and update payment record
      const payment = await Payment.findOne({ sessionId: session_id });
      if (payment) {
        payment.status = 'canceled';
        await payment.save();
      }
    }

    res.json({
      success: true,
      message: 'Payment was cancelled',
      data: {
        sessionId: session_id
      }
    });

  } catch (error) {
    console.error('Error handling payment cancel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment cancellation',
      error: error.message
    });
  }
};

// Get payment status
const getPaymentStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const payment = await Payment.findOne({ sessionId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: {
        payment: {
          id: payment._id,
          status: payment.status,
          packageName: payment.packageName,
          packagePrice: payment.packagePrice,
          customerEmail: payment.customerEmail,
          createdAt: payment.createdAt,
          paidAt: payment.paidAt
        }
      }
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};

// Webhook handler for Stripe events
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handlePaymentIntentFailed(failedPayment);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};

// Helper function to handle checkout session completed
const handleCheckoutSessionCompleted = async (session) => {
  try {
    const payment = await Payment.findOne({ sessionId: session.id });
    
    if (payment) {
      payment.status = 'succeeded';
      payment.paidAt = new Date();
      payment.chargeId = session.payment_intent;
      payment.webhookProcessed = true;
      
      await payment.save();
      
      // Create or update order
      let order = await Order.findOne({ paymentId: payment._id });
      
      if (!order) {
        order = new Order({
          customerEmail: payment.customerEmail,
          customerName: payment.customerName,
          packageName: payment.packageName,
          packagePrice: payment.packagePrice,
          paymentId: payment._id,
          status: 'paid',
          serviceStartDate: new Date(),
          serviceEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          notes: `Payment completed via Stripe webhook. Session ID: ${session.id}`
        });
        
        await order.save();
      }
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
};

// Helper function to handle payment intent succeeded
const handlePaymentIntentSucceeded = async (paymentIntent) => {
  try {
    const payment = await Payment.findOne({ paymentIntentId: paymentIntent.id });
    
    if (payment) {
      payment.status = 'succeeded';
      payment.paidAt = new Date();
      payment.chargeId = paymentIntent.id;
      payment.webhookProcessed = true;
      
      await payment.save();
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
};

// Helper function to handle payment intent failed
const handlePaymentIntentFailed = async (paymentIntent) => {
  try {
    const payment = await Payment.findOne({ paymentIntentId: paymentIntent.id });
    
    if (payment) {
      payment.status = 'failed';
      payment.webhookProcessed = true;
      
      await payment.save();
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
};

// Test Stripe connection
const testStripeConnection = async (req, res) => {
  try {
    // Test the Stripe key by creating a simple customer
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test Customer'
    });
    
    res.json({
      success: true,
      message: 'Stripe connection successful',
      data: {
        customerId: customer.id,
        keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'NOT FOUND'
      }
    });
  } catch (error) {
    console.error('Stripe connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Stripe connection failed',
      error: error.message,
      keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'NOT FOUND'
    });
  }
};

module.exports = {
  createCheckoutSession,
  handlePaymentSuccess,
  handlePaymentCancel,
  getPaymentStatus,
  handleWebhook,
  testStripeConnection
};
