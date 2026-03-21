import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.static(__dirname));

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_PLAN_ID = process.env.WHOP_PLAN_ID;
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || "salafit.myshopify.com";

// Serve checkout page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "checkout.html"));
});

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(__dirname, "checkout.html"));
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", plan: WHOP_PLAN_ID ? "set" : "missing", key: WHOP_API_KEY ? "set" : "missing" });
});

// Create Whop checkout session
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
    total = Math.round(total * 100); // cents

    console.log(`[/create] email=${email} total=$${total / 100} plan=${WHOP_PLAN_ID}`);

    // Try Whop API v2
    const response = await fetch("https://api.whop.com/api/v2/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: WHOP_PLAN_ID,
        email: email || undefined,
        metadata: {
          cart_total_cents: total,
          items: cart?.items?.map(i => `${i.title} x${i.quantity}`).join(", ") || ""
        }
      }),
    });

    const data = await response.json();
    console.log("[Whop response]", JSON.stringify(data));

    const url = data.purchase_url || data.url || data.checkout_url;
    if (!url) {
      return res.status(400).json({ error: data });
    }

    res.json({ url });
  } catch (err) {
    console.error("[/create error]", err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
