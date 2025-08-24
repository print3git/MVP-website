#!/usr/bin/env node
const dotenv = require("dotenv");

const envFile = process.argv[2];
const expectedSecret = process.env.STRIPE_SECRET_KEY;
const expectedWebhook = process.env.STRIPE_WEBHOOK_SECRET;

dotenv.config({ path: envFile });

const okSecret = process.env.STRIPE_SECRET_KEY === expectedSecret;
const okWebhook = process.env.STRIPE_WEBHOOK_SECRET === expectedWebhook;

console.log(String(okSecret));
console.log(String(okWebhook));
