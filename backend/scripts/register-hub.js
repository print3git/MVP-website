#!/usr/bin/env node
require("dotenv").config();
const axios = require("axios");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

const argv = yargs(hideBin(process.argv))
  .option("name", { type: "string", demandOption: true })
  .option("location", { type: "string" })
  .option("operator", { type: "string" })
  .option("api", {
    type: "string",
    default: process.env.API_URL || "http://localhost:3000/api",
  })
  .strict().argv;

async function registerHub() {
  try {
    const { data } = await axios.post(
      `${argv.api}/admin/hubs`,
      { name: argv.name, location: argv.location, operator: argv.operator },
      { headers: { "x-admin-token": process.env.ADMIN_TOKEN || "" } },
    );
    console.log("Created hub", data);
  } catch (err) {
    console.error("Failed to create hub", err.response?.data || err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  registerHub();
}
