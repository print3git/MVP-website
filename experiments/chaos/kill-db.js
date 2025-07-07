// This script triggers a Gremlin attack that terminates the database connection.
// It is intended for manual chaos testing only and should not run in CI.
// Set GREMLIN_TEAM_ID and GREMLIN_API_KEY environment variables before running.

const https = require("https");

const teamId = process.env.GREMLIN_TEAM_ID;
const apiKey = process.env.GREMLIN_API_KEY;

if (!teamId || !apiKey) {
  console.error("GREMLIN_TEAM_ID and GREMLIN_API_KEY must be set");
  process.exit(1);
}

const attack = {
  target: {
    type: "Random",
    hosts: [{ tags: { role: "database" } }],
  },
  command: {
    type: "shutdown",
    args: { length: "60s" },
  },
};

const data = JSON.stringify(attack);

const options = {
  hostname: "api.gremlin.com",
  path: `/v1/attacks/new`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
    Authorization: `Key ${apiKey}`,
    "Gremlin-Team-Id": teamId,
  },
};

const req = https.request(options, (res) => {
  console.log(`status: ${res.statusCode}`);
  res.on("data", (d) => process.stdout.write(d));
});

req.on("error", (error) => {
  console.error(error);
});

req.write(data);
req.end();
