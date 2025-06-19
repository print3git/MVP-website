#!/usr/bin/env node
require("dotenv").config();
const axios = require("axios");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const argv = yargs(hideBin(process.argv))
  .option("hub", { type: "number", demandOption: true })
  .option("serial", { type: "string", demandOption: true })
  .option("api", {
    type: "string",
    default: process.env.API_URL || "http://localhost:3000/api",
  })
  .strict().argv;

async function registerPrinter() {
  const url = `${argv.api}/admin/hubs/${argv.hub}/printers`;
  try {
    const res = await axios.post(
      url,
      { serial: argv.serial },
      {
        headers: { "x-admin-token": process.env.ADMIN_TOKEN || "" },
      },
    );
    console.log("Registered printer", res.data);
  } catch (err) {
    console.error(
      "Failed to register printer",
      err.response?.data || err.message,
    );
    process.exit(1);
  }
}

if (require.main === module) {
  registerPrinter();
}
