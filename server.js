const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['https://salafit.myshopify.com', 'https://www.salafit.com', 'https://salafit.com'],
  credentials: true
}));

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_PLAN_ID = process.env.WHOP_PLAN_ID;

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Salafit backend running!' });
});

// Create Whop checkout session
app.post('/create', async (req, res) => {
  try {
    const { email, cart, protection } = req.body;

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate total from cart
    let total = cart.items.reduce((sum, item) => {
      return sum + (item.price / 100) * item.quantity;
    }, 0);

    // Add shipping protection if selected
    if (protection) total += 3.95;

    // Round to 2 decimal places
    total = Math.round(total * 100) / 100;

    console.log(`Creating Whop session for ${email} - Total: $${total}`);

    // Create Whop checkout session
    const whopRes = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id: WHOP_PLAN_ID,
        email: email || undefined,
        metadata: {
          cart_items: cart.items.map(i => i.title).join(', '),
          cart_total: total,
          shopify_cart_token: cart.token || ''
        }
      })
    });

    const whopData = await whopRes.json();
    console.log('Whop response:', whopData);

    if (!whopData.purchase_url && !whopData.url) {
      return res.status(500).json({ error: 'Failed to create Whop session', details: whopData });
    }

    res.json({
      url: whopData.purchase_url || whopData.url,
      session_id: whopData.id
    });

  } catch (err) {
    console.error('Error creating checkout:', err);
    res.status(500).json({ error: err.message });
  }
});

// Whop webhook - called when payment is successful
app.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    console.log('Whop webhook received:', event.action);

    if (event.action === 'payment.succeeded') {
      const metadata = event.data?.metadata || {};
      console.log('Payment succeeded! Cart:', metadata.cart_items, 'Total: $' + metadata.cart_total);

      // Here you can:
      // 1. Send confirmation email
      // 2. Create order in Shopify via API
      // 3. Notify yourself via Slack/email
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Salafit backend running on port ${PORT}`);
});
