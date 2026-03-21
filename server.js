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

app.get("/", (req, res) => {
  res.send("Salafit backend running ✅");
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

    console.log(`Creating session for ${email} - Total: $${total}`);

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
          cart_total: total,
          cart_items: cart?.items?.map(i => i.title).join(", ") || ""
        }
      }),
    });

    const data = await response.json();
    console.log("Whop response:", JSON.stringify(data));

    const url = data.purchase_url || data.url;
    if (!url) {
      return res.status(400).json({ error: data });
    }

    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
