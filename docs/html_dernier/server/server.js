require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const SUCCESS_URL = process.env.SUCCESS_URL || "https://pixmell.net/success.html";
const CANCEL_URL = process.env.CANCEL_URL || "https://pixmell.net/cancel.html";
const SHIPPING_EUR = 5.99;

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const lineItems = items.map((item) => {
      const name = String(item.name || "Produit");
      const description = item.options ? String(item.options).slice(0, 200) : "";
      const unitAmount = Math.max(0, Math.round(Number(item.price) * 100));
      const quantity = Math.max(1, Number(item.qty || 1));

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name,
            description,
          },
          unit_amount: unitAmount,
        },
        quantity,
      };
    });

    lineItems.push({
      price_data: {
        currency: "eur",
        product_data: { name: "Livraison" },
        unit_amount: Math.round(SHIPPING_EUR * 100),
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: "Stripe error" });
  }
});

const port = process.env.PORT || 4242;
app.listen(port, () => {
  console.log(`Stripe server running on ${port}`);
});
