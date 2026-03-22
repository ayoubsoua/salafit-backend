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
const WHOP_COMPANY_ID = process.env.WHOP_COMPANY_ID;

app.get("/", (req, res) => {
  res.send("Salafit backend running ✅");
});

// Test API key
app.get("/test", async (req, res) => {
  try {
    const response = await fetch("https://api.whop.com/api/v2/me", {
      headers: { Authorization: `Bearer ${WHOP_API_KEY}` }
    });
    const data = await response.json();
    res.json(data);
  } catch(e) {
    res.json({ error: e.message });
  }
});

app.post("/create", async (req, res) => {
  try {
    const { email, cart, protection } = req.body;

    // Calculate total
    let total = 0;
    if (cart && cart.items) {
      cart.items.forEach(item => {
        total += (item.price / 100) * item.quantity;
      });
    }
    if (protection) total += 3.95;
    if (total === 0) total = 1;
    total = Math.round(total * 100) / 100;

    const WHOP_PLAN_ID = process.env.WHOP_PLAN_ID || "plan_xQ7ZVfkpfVcJM";

    console.log(`[/create] email=${email} total=$${total} plan=${WHOP_PLAN_ID}`);

    // Create checkout session using correct Whop API
    const response = await fetch(`https://api.whop.com/api/v2/checkout_configurations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: WHOP_COMPANY_ID,
        plan: {
          plan_id: WHOP_PLAN_ID,
          initial_price: total,
          plan_type: "one_time",
        },
        metadata: {
          cart_total_cents: Math.round(total * 100),
          items: cart?.items?.map(i => `${i.title} x${i.quantity}`).join(", ") || "",
        }
      }),
    });

    const data = await response.json();
    console.log("[Whop response]", JSON.stringify(data));

    const url = data.purchase_url || data.url || (data.id ? `https://whop.com/checkout/${WHOP_PLAN_ID}/?session=${data.id}` : null);

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
