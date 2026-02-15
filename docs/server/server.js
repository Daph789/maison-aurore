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
const DEFAULT_ALLOWED_COUNTRIES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
  "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ",
  "DE","DJ","DK","DM","DO","DZ",
  "EC","EE","EG","EH","ER","ES","ET",
  "FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY",
  "HK","HM","HN","HR","HT","HU",
  "ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT",
  "JE","JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ",
  "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
  "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
  "NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ",
  "OM",
  "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY",
  "QA",
  "RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ",
  "TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
  "UA","UG","UM","US","UY","UZ",
  "VA","VC","VE","VG","VI","VN","VU",
  "WF","WS",
  "YE","YT",
  "ZA","ZM","ZW"
];

const ALLOWED_COUNTRIES = (process.env.ALLOWED_COUNTRIES || "")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const profile = req.body && typeof req.body.profile === "object" ? req.body.profile : {};
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

    const sessionParams = {
      mode: "payment",
      line_items: lineItems,
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      phone_number_collection: { enabled: true },
      billing_address_collection: "required",
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: Math.round(SHIPPING_EUR * 100),
              currency: "eur",
            },
            display_name: "Livraison standard",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 2 },
              maximum: { unit: "business_day", value: 5 },
            },
          },
        },
      ],
    };

    const countries = ALLOWED_COUNTRIES.length ? ALLOWED_COUNTRIES : DEFAULT_ALLOWED_COUNTRIES;
    sessionParams.shipping_address_collection = { allowed_countries: countries };

    const email = String(profile.email || "").trim();
    const name = String(profile.full_name || "").trim();
    const phone = String(profile.phone || "").trim();
    const line1 = String(profile.line1 || "").trim();
    const line2 = String(profile.line2 || "").trim();
    const city = String(profile.city || "").trim();
    const postalCode = String(profile.postal_code || "").trim();
    const country = String(profile.country || "").trim().toUpperCase();
    const hasAddress = line1 && city && postalCode && country.length === 2;

    if (email) {
      sessionParams.customer_email = email;
    }

    if (email || name || phone || hasAddress) {
      const customerPayload = {};
      if (email) customerPayload.email = email;
      if (name) customerPayload.name = name;
      if (phone) customerPayload.phone = phone;
      if (hasAddress) {
        customerPayload.address = {
          line1,
          city,
          postal_code: postalCode,
          country,
        };
        if (line2) customerPayload.address.line2 = line2;
        customerPayload.shipping = {
          name: name || "Client",
          address: customerPayload.address,
          phone: phone || undefined,
        };
      }

      const customer = await stripe.customers.create(customerPayload);
      sessionParams.customer = customer.id;
      delete sessionParams.customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: "Stripe error" });
  }
});

const port = process.env.PORT || 4242;
app.listen(port, () => {
  console.log(`Stripe server running on ${port}`);
});
