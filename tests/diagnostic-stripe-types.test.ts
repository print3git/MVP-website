const ts = require("typescript");
const path = require("path");

function typecheck(file) {
  const configPath = path.join(__dirname, "../backend/tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
  );
  const baseFiles = [path.join(__dirname, "../backend/global.d.ts")];
  const program = ts.createProgram([...baseFiles, file], {
    ...parsed.options,
    noEmit: true,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  expect(diagnostics).toEqual([]);
}

describe("diagnostic stripe types", () => {
  test("routes compile", () => {
    typecheck(
      path.join(
        __dirname,
        "../backend/src/routes/stripe/create-checkout-session.ts",
      ),
    );
    typecheck(
      path.join(__dirname, "../backend/src/routes/stripe/webhook.ts"),
    );
  });
});
