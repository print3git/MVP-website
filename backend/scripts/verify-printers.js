#!/usr/bin/env node
require("dotenv").config();
const axios = require("axios");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const argv = yargs(hideBin(process.argv))
  .option("hub", { type: "number", demandOption: true })
  .option("api", {
    type: "string",
    default: process.env.API_URL || "http://localhost:3000/api",
  })
  .strict().argv;

async function verify() {
  try {
    const { data: hubs } = await axios.get(`${argv.api}/admin/hubs`, {
      headers: { "x-admin-token": process.env.ADMIN_TOKEN || "" },
    });
    const hub = hubs.find((h) => h.id === argv.hub);
    if (!hub) throw new Error("Hub not found");
    for (const printer of hub.printers) {
      const base = `http://${printer.serial}.local`;
      try {
        await axios.get(`${base}/api/printer`, { timeout: 5000 });
        await axios.get(`${base}:8080/stream`, { timeout: 5000 });
        console.log(printer.serial, "ok");
      } catch (_err) {
        console.error(printer.serial, "offline or camera error");
        process.exitCode = 1;
      }
    }
  } catch (err) {
    console.error(err.response?.data || err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  verify();
}
