import express from "express";
import fetch from "node-fetch";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_PLAN_ID = process.env.WHOP_PLAN_ID;

const CHECKOUT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Secure Checkout</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --black: #111; --white: #fff; --gray-50: #f9f9f9; --gray-100: #f2f2f2;
      --gray-200: #e5e5e5; --gray-400: #aaa; --gray-600: #666; --radius: 8px;
    }
    body { font-family: 'DM Sans', sans-serif; background: var(--gray-50); color: var(--black); min-height: 100vh; }
    .topbar { background: var(--black); color: var(--white); text-align: center; padding: 10px; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
    header { background: var(--white); border-bottom: 1px solid var(--gray-200); padding: 18px 40px; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: var(--black); text-decoration: none; }
    .secure-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--gray-600); }
    .timer-bar { background: #fef3cd; border-bottom: 1px solid #f5d769; padding: 10px 40px; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; color: #7a5c00; }
    #countdown { font-weight: 700; font-size: 15px; color: #c05600; font-variant-numeric: tabular-nums; }
    .breadcrumb { padding: 14px 40px; font-size: 12px; color: var(--gray-400); letter-spacing: 1px; text-transform: uppercase; }
    .breadcrumb span { color: var(--black); }
    .checkout-layout { display: grid; grid-template-columns: 1fr 420px; gap: 0; max-width: 1100px; margin: 0 auto; padding: 0 40px 60px; align-items: start; }
    .left { padding-right: 50px; }
    section { margin-bottom: 32px; }
    .section-title { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 600; letter-spacing: 1px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--gray-200); }
    .field-group { display: flex; flex-direction: column; gap: 10px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    input, select { width: 100%; padding: 13px 14px; border: 1px solid var(--gray-200); border-radius: var(--radius); font-family: 'DM Sans', sans-serif; font-size: 14px; background: var(--white); color: var(--black); transition: border-color 0.2s; outline: none; }
    input:focus, select:focus { border-color: var(--black); }
    input::placeholder { color: var(--gray-400); }
    .phone-row { display: grid; grid-template-columns: 80px 1fr; gap: 10px; }
    .shipping-box { border: 2px solid var(--black); border-radius: var(--radius); padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; background: var(--white); }
    .shipping-box .label { font-weight: 500; }
    .shipping-box .price { font-weight: 600; color: #22c55e; }
    .protection-box { border: 1px solid var(--gray-200); border-radius: var(--radius); padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; background: var(--white); cursor: pointer; transition: border-color 0.2s; }
    .protection-box:hover { border-color: var(--black); }
    .protection-box input[type="checkbox"] { width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px; accent-color: var(--black); cursor: pointer; }
    .protection-box .prot-text .prot-title { font-weight: 500; font-size: 14px; }
    .protection-box .prot-text .prot-desc { font-size: 12px; color: var(--gray-600); margin-top: 2px; }
    .protection-box .prot-price { margin-left: auto; font-weight: 600; font-size: 14px; white-space: nowrap; }
    #whopFrame { width: 100%; height: 380px; border: none; border-radius: var(--radius); background: var(--white); display: none; }
    .payment-loading { background: var(--white); border: 1px solid var(--gray-200); border-radius: var(--radius); height: 380px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--gray-400); font-size: 13px; }
    .spinner { width: 28px; height: 28px; border: 2px solid var(--gray-200); border-top-color: var(--black); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .cta-btn { width: 100%; padding: 16px; background: var(--black); color: var(--white); border: none; border-radius: var(--radius); font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; margin-top: 16px; transition: opacity 0.2s; }
    .cta-btn:hover { opacity: 0.85; }
    .payment-logos { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
    .right { position: sticky; top: 24px; background: var(--white); border: 1px solid var(--gray-200); border-radius: 12px; overflow: hidden; }
    .right-header { background: var(--black); color: var(--white); padding: 18px 24px; font-family: 'Cormorant Garamond', serif; font-size: 18px; letter-spacing: 1px; }
    .order-body { padding: 20px 24px; }
    .order-item { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
    .order-item img { width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid var(--gray-200); background: var(--gray-100); }
    .item-info { flex: 1; }
    .item-name { font-size: 13px; font-weight: 500; line-height: 1.4; }
    .item-variant { font-size: 12px; color: var(--gray-400); margin-top: 2px; }
    .item-qty { font-size: 12px; color: var(--gray-600); margin-top: 4px; }
    .item-price { font-size: 14px; font-weight: 600; white-space: nowrap; }
    .divider { border: none; border-top: 1px solid var(--gray-200); margin: 14px 0; }
    .promo-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 16px; }
    .promo-row input { font-size: 13px; padding: 10px 12px; }
    .promo-btn { padding: 10px 16px; background: var(--gray-100); border: 1px solid var(--gray-200); border-radius: var(--radius); font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; }
    .promo-btn:hover { background: var(--gray-200); }
    .summary-line { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; color: var(--gray-600); }
    .summary-line.total { font-size: 16px; font-weight: 600; color: var(--black); margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gray-200); }
    .summary-line .free { color: #22c55e; font-weight: 500; }
    .trust-badges { border-top: 1px solid var(--gray-200); padding: 16px 24px; display: flex; flex-direction: column; gap: 10px; }
    .badge-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--gray-600); }
    .badge-icon { width: 32px; height: 32px; border-radius: 50%; background: var(--gray-100); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .whop-secured { text-align: center; font-size: 11px; color: var(--gray-400); padding: 12px 24px; border-top: 1px solid var(--gray-200); }
    @media (max-width: 800px) {
      .checkout-layout { grid-template-columns: 1fr; padding: 0 16px 60px; }
      .left { padding-right: 0; }
      .right { position: static; order: -1; }
      header { padding: 14px 16px; }
      .timer-bar, .breadcrumb { padding: 10px 16px; }
    }
  </style>
</head>
<body>
<div class="topbar">🔒 Secure Checkout — Free U.S. Shipping + 30-Day Returns</div>
<header>
  <a class="logo" href="javascript:history.back()">Salafit</a>
  <div class="secure-badge">
    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    SSL Secured
  </div>
</header>
<div class="timer-bar">⏰ Your cart is reserved for <span id="countdown">05:00</span> — complete your order before time runs out!</div>
<div class="breadcrumb">Cart → <span>Checkout</span></div>
<div class="checkout-layout">
  <div class="left">
    <section>
      <div class="section-title">Contact</div>
      <div class="field-group">
        <input id="email" type="email" placeholder="Email address" required/>
        <div class="phone-row">
          <select><option>+1</option><option>+44</option><option>+61</option></select>
          <input type="tel" placeholder="Phone (optional)"/>
        </div>
      </div>
    </section>
    <section>
      <div class="section-title">Delivery</div>
      <div class="field-group">
        <select><option>United States</option><option>Canada</option><option>United Kingdom</option></select>
        <div class="row">
          <input placeholder="First name" required/>
          <input placeholder="Last name" required/>
        </div>
        <input id="address" placeholder="Address" required/>
        <input placeholder="Apartment, suite (optional)"/>
        <div class="row">
          <input placeholder="City"/>
          <input placeholder="State"/>
        </div>
        <input placeholder="ZIP code"/>
      </div>
    </section>
    <section>
      <div class="section-title">Shipping method</div>
      <div class="field-group">
        <div class="shipping-box">
          <div>
            <div class="label">Premium Shipping · 3–7 business days</div>
            <div style="font-size:12px;color:#666;margin-top:3px;">USPS / UPS / FedEx</div>
          </div>
          <div class="price">FREE</div>
        </div>
        <label class="protection-box">
          <input type="checkbox" id="protection"/>
          <div class="prot-text">
            <div class="prot-title">🛡 Shipping Protection</div>
            <div class="prot-desc">Covers loss, theft & damage in transit</div>
          </div>
          <div class="prot-price">+$3.95</div>
        </label>
      </div>
    </section>
    <section>
      <div class="section-title">Billing address</div>
      <label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;">
        <input type="checkbox" checked style="width:16px;height:16px;accent-color:#111;"/> Same as shipping address
      </label>
    </section>
    <section>
      <div class="section-title">Payment method</div>
      <div id="paymentWrapper">
        <div class="payment-loading" id="paymentLoading">
          <div class="spinner"></div>
          <span>Loading payment options…</span>
        </div>
        <iframe id="whopFrame"></iframe>
      </div>
      <button class="cta-btn" onclick="submitCheckout()">Complete Order</button>
      <div class="payment-logos">
        <svg width="38" height="24" viewBox="0 0 38 24" fill="none"><rect width="38" height="24" rx="4" fill="#f3f3f3"/><text x="19" y="16" text-anchor="middle" font-size="9" font-family="sans-serif" font-weight="700" fill="#1a1f71">VISA</text></svg>
        <svg width="38" height="24" viewBox="0 0 38 24" fill="none"><rect width="38" height="24" rx="4" fill="#f3f3f3"/><circle cx="15" cy="12" r="7" fill="#eb001b" opacity="0.9"/><circle cx="23" cy="12" r="7" fill="#f79e1b" opacity="0.9"/></svg>
        <svg width="38" height="24" viewBox="0 0 38 24" fill="none"><rect width="38" height="24" rx="4" fill="#f3f3f3"/><text x="19" y="15" text-anchor="middle" font-size="6" font-family="sans-serif" font-weight="700" fill="#00d632">Cash App</text></svg>
        <svg width="38" height="24" viewBox="0 0 38 24" fill="none"><rect width="38" height="24" rx="4" fill="#f3f3f3"/><text x="19" y="15" text-anchor="middle" font-size="6.5" font-family="sans-serif" font-weight="700" fill="#003087">PayPal</text></svg>
      </div>
    </section>
  </div>
  <div class="right">
    <div class="right-header">Order Summary</div>
    <div class="order-body">
      <div class="order-items" id="orderItems"></div>
      <hr class="divider"/>
      <div class="promo-row">
        <input type="text" id="promoCode" placeholder="Promo code"/>
        <button class="promo-btn" onclick="applyPromo()">Apply</button>
      </div>
      <div class="summary-line"><span>Subtotal</span><span id="subtotalVal">—</span></div>
      <div class="summary-line"><span>Shipping</span><span class="free">FREE</span></div>
      <div class="summary-line" id="protectionLine" style="display:none;"><span>Shipping Protection</span><span>$3.95</span></div>
      <div class="summary-line total"><span>Total</span><strong id="totalVal">—</strong></div>
    </div>
    <div class="trust-badges">
      <div class="badge-row"><div class="badge-icon">💰</div><span><strong>Lowest Price Guarantee</strong> — We beat any competitor</span></div>
      <div class="badge-row"><div class="badge-icon">📦</div><span><strong>Ships Today</strong> — Order before 3PM EST</span></div>
      <div class="badge-row"><div class="badge-icon">↩️</div><span><strong>30-Day Returns</strong> — No questions asked</span></div>
    </div>
    <div class="whop-secured">🔒 Payments secured by <strong>Whop</strong></div>
  </div>
</div>
<script>
  const BACKEND = 'https://salafit-backend-production.up.railway.app';
  const SHOPIFY = 'https://salafit.myshopify.com';

  let secs = 5 * 60;
  const cd = document.getElementById('countdown');
  setInterval(() => {
    if (secs <= 0) return;
    secs--;
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    cd.textContent = m + ':' + s;
    if (secs < 60) cd.style.color = '#e53e3e';
  }, 1000);

  let cartData = null;
  let baseTotal = 0;

  async function loadCart() {
    try {
      const cart = await fetch(SHOPIFY + '/cart.js', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }).then(r => r.json());
      cartData = cart;
      const items = document.getElementById('orderItems');
      items.innerHTML = '';
      cart.items.forEach(function(item) {
        const price = (item.price / 100).toFixed(2);
        baseTotal += (item.price / 100) * item.quantity;
        const div = document.createElement('div');
        div.className = 'order-item';
        div.innerHTML = '<img src="' + (item.image || '') + '" alt="' + item.title + '"/>' +
          '<div class="item-info">' +
            '<div class="item-name">' + item.title + '</div>' +
            '<div class="item-variant">' + (item.variant_title || '') + '</div>' +
            '<div class="item-qty">Qty: ' + item.quantity + '</div>' +
          '</div>' +
          '<div class="item-price">$' + price + '</div>';
        items.appendChild(div);
      });
      updateTotals();
      initPayment();
    } catch(e) {
      console.error('Cart error:', e);
      initPayment();
    }
  }

  function updateTotals() {
    const prot = document.getElementById('protection').checked;
    const total = baseTotal + (prot ? 3.95 : 0);
    document.getElementById('subtotalVal').textContent = '$' + baseTotal.toFixed(2);
    document.getElementById('totalVal').textContent = '$' + total.toFixed(2);
    document.getElementById('protectionLine').style.display = prot ? 'flex' : 'none';
  }

  document.getElementById('protection').addEventListener('change', updateTotals);

  async function initPayment() {
    const frame = document.getElementById('whopFrame');
    const loader = document.getElementById('paymentLoading');
    try {
      const email = document.getElementById('email').value;
      const protection = document.getElementById('protection').checked;
      const res = await fetch(BACKEND + '/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart: cartData, email: email, protection: protection })
      });
      const data = await res.json();
      if (!data.url) throw new Error(JSON.stringify(data));
      let embedUrl = data.url.replace('https://whop.com/checkout/', 'https://whop.com/embedded/checkout/');
      const params = 'v=2&theme=light&hide_price=true&skip_redirect=true&hide_submit_button=true&email.hidden=1&address.hidden=1&style.container.paddingX=0&style.container.paddingTop=10&style.container.paddingBottom=0&theme.accentColor=gray&theme.highContrast=1';
      frame.src = embedUrl + '?' + params;
      frame.onload = function() {
        loader.style.display = 'none';
        frame.style.display = 'block';
      };
    } catch(e) {
      console.error('Payment error:', e);
      loader.innerHTML = '<div style="color:#e53e3e;text-align:center;font-size:13px;padding:20px;">Payment failed to load.<br><button onclick="initPayment()" style="margin-top:10px;padding:8px 16px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;">Try again</button></div>';
    }
  }

  function submitCheckout() {
    const email = document.getElementById('email').value;
    if (!email) { alert('Please enter your email address.'); return; }
    initPayment();
  }

  function applyPromo() {
    const code = document.getElementById('promoCode').value.trim().toUpperCase();
    if (!code) return;
    alert('Promo code "' + code + '" applied!');
  }

  loadCart();
</script>
</body>
</html>`;

app.get(["/", "/checkout"], (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(CHECKOUT_HTML);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", plan: WHOP_PLAN_ID ? "set" : "missing" });
});

app.post("/create", async (req, res) => {
  try {
    const { email, cart, protection } = req.body;
    let total = 0;
    if (cart && cart.items) {
      cart.items.forEach(item => {
        total += (item.price / 100) * item.quantity;
      });
    }
    if (protection) total += 3.95;
    if (total === 0) total = 1;
    total = Math.round(total * 100);

    console.log("[/create] email=" + email + " total=$" + (total/100) + " plan=" + WHOP_PLAN_ID);

    const response = await fetch("https://api.whop.com/api/v2/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + WHOP_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: WHOP_PLAN_ID,
        email: email || undefined,
        metadata: {
          cart_total_cents: total,
          items: cart && cart.items ? cart.items.map(i => i.title + " x" + i.quantity).join(", ") : ""
        }
      }),
    });

    const data = await response.json();
    console.log("[Whop response]", JSON.stringify(data));

    const url = data.purchase_url || data.url || data.checkout_url;
    if (!url) return res.status(400).json({ error: data });
    res.json({ url });
  } catch (err) {
    console.error("[/create error]", err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
