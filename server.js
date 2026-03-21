import express from "express";
import fetch from "node-fetch";

const app = express();

// ✅ FORCE CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

// ENV
const WHOP_API_KEY = process.env.WHOP_API_KEY;
const PLAN_ID = process.env.PLAN_ID;

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

// CREATE CHECKOUT SESSION
app.post("/create", async (req, res) => {
  try {
    const { email, cart } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    let total = 0;

    if (cart && cart.items) {
      cart.items.forEach(item => {
        total += (item.price / 100) * item.quantity;
      });
    }

    if (total === 0) total = 1;

    const response = await fetch("https://api.whop.com/v2/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: PLAN_ID,
        quantity: 1,
        custom_price: Math.round(total * 100),
        metadata: { email }
      }),
    });

    const data = await response.json();
    console.log("WHOP:", data);

    if (!data.url) {
      return res.status(400).json({ error: data });
    }

    res.json({ url: data.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🚀 FIXED PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
