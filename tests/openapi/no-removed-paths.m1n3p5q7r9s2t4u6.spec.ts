import fs from "fs";
import path from "path";
import YAML from "yaml";

describe("openapi contract", () => {
  test("does not list /api/generate-model", () => {
    const specPath = path.join(__dirname, "../../docs/openapi.yaml");
    const raw = fs.readFileSync(specPath, "utf8");
    const spec = YAML.parse(raw);
    expect(spec.paths["/api/generate-model"]).toBeUndefined();
  });
});
