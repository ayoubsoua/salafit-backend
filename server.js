import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// ✅ FIXED CORS (VERY IMPORTANT)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.options("*", cors());

app.use(express.json());

// 🔥 ENV VARIABLES (set these in Railway)
const WHOP_API_KEY = process.env.WHOP_API_KEY;
const PLAN_ID = process.env.PLAN_ID;

// ✅ HEALTH CHECK (optional)
app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

// 🚀 CREATE CHECKOUT SESSION
app.post("/create", async (req, res) => {
  try {
    const { email, cart } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    // 🧮 Calculate total from Shopify cart
    let total = 0;

    if (cart && cart.items) {
      cart.items.forEach(item => {
        total += (item.price / 100) * item.quantity;
      });
    }

    // fallback if empty
    if (total === 0) total = 1;

    console.log("TOTAL:", total);

    // 🔥 CREATE WHOP SESSION
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
        metadata: {
          email
        }
      }),
    });

    const data = await response.json();
    console.log("WHOP RESPONSE:", data);

    if (!data.url) {
      return res.status(400).json({ error: data });
    }

    res.json({ url: data.url });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🚀 START SERVER
app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});
