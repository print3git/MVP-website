import ts from "typescript";
import path from "path";

function createProgram(file: string) {
  const configPath = path.join(__dirname, "../tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(configPath),
  );
  const program = ts.createProgram(
    [path.join(__dirname, "../global.d.ts"), file],
    { ...parsed.options, noEmit: true },
  );
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(file)!;
  return { program, checker, sourceFile };
}

function getHandlerParams(sourceFile: ts.SourceFile) {
  let params: ts.NodeArray<ts.ParameterDeclaration> | undefined;
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "post"
    ) {
      const fn = node.arguments[node.arguments.length - 1];
      if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
        params = fn.parameters;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  if (!params) throw new Error("handler not found");
  return params;
}

function getBodyType(
  checker: ts.TypeChecker,
  req: ts.ParameterDeclaration,
) {
  const reqType = checker.getTypeAtLocation(req);
  const bodyProp = reqType.getProperty("body");
  return bodyProp
    ? checker.getTypeOfSymbolAtLocation(bodyProp, req)
    : undefined;
}

function assertProp(
  checker: ts.TypeChecker,
  type: ts.Type,
  name: string,
  expected: string,
) {
  const prop = type.getProperty(name);
  expect(prop).toBeDefined();
  const propType = checker.getTypeOfSymbolAtLocation(
    prop!,
    (prop!.valueDeclaration ?? prop!.declarations![0])!,
  );
  expect(checker.typeToString(propType)).toBe(expected);
}

function hasCallable(
  checker: ts.TypeChecker,
  type: ts.Type,
  name: string,
) {
  const prop = type.getProperty(name);
  if (!prop) return false;
  const propType = checker.getTypeOfSymbolAtLocation(
    prop,
    (prop.valueDeclaration ?? prop.declarations![0])!,
  );
  return propType.getCallSignatures().length > 0;
}

function isAssignableToReadableStream(
  checker: ts.TypeChecker,
  type: ts.Type,
) {
  const sym = checker.resolveName(
    "ReadableStream",
    undefined,
    ts.SymbolFlags.Interface | ts.SymbolFlags.Type,
    false,
  );
  if (!sym) return false;
  const rsType = checker.getDeclaredTypeOfSymbol(sym);
  return checker.isTypeAssignableTo(type, rsType);
}

describe("stripe route type checks", () => {
  const checkoutPath = path.join(
    __dirname,
    "../src/routes/stripe/create-checkout-session.ts",
  );
  const webhookPath = path.join(
    __dirname,
    "../src/routes/stripe/webhook.ts",
  );

  test("checkout request body and response types", () => {
    const { checker, sourceFile } = createProgram(checkoutPath);
    const [reqParam, resParam] = getHandlerParams(sourceFile);
    const bodyType = getBodyType(checker, reqParam)!;
    assertProp(checker, bodyType, "price", "number");
    assertProp(checker, bodyType, "qty", "number | undefined");
    assertProp(
      checker,
      bodyType,
      "metadata",
      "{ [x: string]: string; } | undefined",
    );
    assertProp(checker, bodyType, "userId", "string | undefined");
    expect(isAssignableToReadableStream(checker, bodyType)).toBe(false);
    const resType = checker.getTypeAtLocation(resParam);
    expect(hasCallable(checker, resType, "json")).toBe(true);
    expect(hasCallable(checker, resType, "status")).toBe(true);
  });

  test("webhook request body and response types", () => {
    const { checker, sourceFile } = createProgram(webhookPath);
    const [reqParam, resParam] = getHandlerParams(sourceFile);
    const bodyType = getBodyType(checker, reqParam)!;
    expect(checker.typeToString(bodyType)).toBe("Buffer");
    expect(isAssignableToReadableStream(checker, bodyType)).toBe(false);
    const resType = checker.getTypeAtLocation(resParam);
    expect(hasCallable(checker, resType, "status")).toBe(true);
    expect(hasCallable(checker, resType, "sendStatus")).toBe(true);
  });
});
