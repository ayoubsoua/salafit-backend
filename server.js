const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_PLAN_ID = process.env.WHOP_PLAN_ID;

const INFLUENCER_SHIPPING = 2.00; // test amount

app.post('/create', async (req, res) => {
  try {
    const { cart, email, protection, influencer } = req.body;

    let totalAmount;

    if (influencer) {
      // Influencer: products FREE, pay only DHL shipping
      totalAmount = INFLUENCER_SHIPPING;
      if (protection) totalAmount += 3.95;
      console.log(`Influencer order — shipping only: £${totalAmount}`);
    } else {
      // Normal customer: full cart price
      let totalCents = cart.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      if (protection) totalCents += 395;
      totalAmount = totalCents / 100;
      console.log(`Normal order — Total: $${totalAmount.toFixed(2)}`);
    }

    const cartSummary = cart.items.map(i => i.title).join(', ');

    const response = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id: WHOP_PLAN_ID,
        email: email || undefined,
        metadata: {
          cart_items: cartSummary,
          cart_total: totalAmount.toFixed(2),
          is_influencer: influencer ? 'yes' : 'no',
          shopify_cart_token: cart.token || ''
        }
      })
    });

    const text = await response.text();
    console.log('Whop response:', text);

    let data;
    try { data = JSON.parse(text); }
    catch (e) { return res.status(500).json({ error: 'Invalid response from Whop' }); }

    if (!response.ok) return res.status(500).json({ error: data });

    const checkoutUrl = data.purchase_url || data.url;
    if (!checkoutUrl) return res.status(500).json({ error: 'No checkout URL returned', data });

    res.json({ url: checkoutUrl });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    plan_id: WHOP_PLAN_ID ? 'set' : 'MISSING',
    api_key: WHOP_API_KEY ? 'set' : 'MISSING'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
