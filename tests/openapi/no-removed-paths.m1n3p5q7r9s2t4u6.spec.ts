import fs from "fs";
import path from "path";
import YAML from "yaml";

describe("openapi contract", () => {
  test("does not list /api/generate-model", () => {
    const jsonPath = path.join(__dirname, "../../docs/openapi.json");
    const yamlPath = path.join(__dirname, "../../docs/openapi.yaml");
    const specPath = fs.existsSync(jsonPath) ? jsonPath : yamlPath;
    const raw = fs.readFileSync(specPath, "utf8");
    const spec = specPath.endsWith(".json") ? JSON.parse(raw) : YAML.parse(raw);
    expect(spec.paths["/api/generate-model"]).toBeUndefined();
  });
});
