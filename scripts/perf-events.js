#!/usr/bin/env node
import autocannon from "autocannon";

const url = process.env.BASE_URL || "http://localhost:3000/v2/events";
const instance = autocannon({
  url,
  connections: 50,
  duration: 20,
  amount: 1000,
});

autocannon.track(instance, {
  renderProgressBar: true,
});

instance.on("done", () => process.exit(0));
