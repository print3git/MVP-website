const path = require("path");
const fs = require("fs");
const swaggerJSDoc = require("swagger-jsdoc");
const YAML = require("yaml");
const { convert } = require("openapi-to-postmanv2");
const serverSource = fs.readFileSync(
  path.join(__dirname, "..", "server.js"),
  "utf8",
);

const options = {
  definition: {
    openapi: "3.0.0",
    info: { title: "print2 API", version: "1.0.0" },
  },
  apis: [
    path.join(__dirname, "..", "server.js"),
    path.join(__dirname, "..", "src", "routes", "*.js"),
  ],
};

const spec = swaggerJSDoc(options);
spec.paths = spec.paths || {};
const regex = /app\.(get|post|put|delete|patch)\(\s*"(\/api[^"\s]*)"/g;
let match;
while ((match = regex.exec(serverSource))) {
  const method = match[1];
  const pathVal = match[2];
  if (!spec.paths[pathVal]) spec.paths[pathVal] = {};
  spec.paths[pathVal][method] = { responses: { 200: { description: "OK" } } };
}
const outDir = path.join(__dirname, "..", "..", "docs");
fs.mkdirSync(outDir, { recursive: true });
const yamlPath = path.join(outDir, "openapi.yaml");
fs.writeFileSync(yamlPath, YAML.stringify(spec));

convert(
  { type: "string", data: YAML.stringify(spec) },
  {},
  (err, conversion) => {
    if (!err && conversion.result) {
      fs.writeFileSync(
        path.join(outDir, "api.postman_collection.json"),
        JSON.stringify(conversion.output[0].data, null, 2),
      );
      console.log("Postman collection written");
    } else {
      console.error("Failed to convert to Postman:", err || conversion);
      process.exit(1);
    }
  },
);
