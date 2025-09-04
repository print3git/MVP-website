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
  return { checker, sourceFile };
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

function getBodyType(checker: ts.TypeChecker, req: ts.ParameterDeclaration) {
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
  const decl = prop!.declarations?.find((d) => ts.isPropertySignature(d)) ||
    prop!.declarations?.[0];
  const propType = checker.getTypeOfSymbolAtLocation(prop!, decl!);
  const typeString = checker.typeToString(propType);
  const isOptional = (prop!.flags & ts.SymbolFlags.Optional) !== 0;
  const finalType = isOptional ? `${typeString} | undefined` : typeString;
  expect(finalType).toBe(expected);
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

describe("stripe route diagnostics", () => {
  const file = path.join(
    __dirname,
    "../src/routes/stripe/create-checkout-session.ts",
  );
  const { checker, sourceFile } = createProgram(file);
  const [reqParam, resParam] = getHandlerParams(sourceFile);
  const bodyType = getBodyType(checker, reqParam)!;
  const resType = checker.getTypeAtLocation(resParam);

  test("body has items array", () => {
    assertProp(checker, bodyType, "items", "Item[] | undefined");
  });

  test("items element has price string", () => {
    const prop = bodyType.getProperty("items")!;
    const propType = checker.getTypeOfSymbolAtLocation(
      prop,
      prop.declarations![0]!,
    );
    const elemType = checker.getTypeArguments(propType as ts.TypeReference)[0];
    assertProp(checker, elemType, "price", "string");
  });

  test("items element has quantity number", () => {
    const prop = bodyType.getProperty("items")!;
    const propType = checker.getTypeOfSymbolAtLocation(
      prop,
      prop.declarations![0]!,
    );
    const elemType = checker.getTypeArguments(propType as ts.TypeReference)[0];
    assertProp(checker, elemType, "quantity", "number");
  });

  test("allows promotion codes flag", () => {
    assertProp(checker, bodyType, "allowPromotionCodes", "boolean | undefined");
  });

  test("metadata is optional record", () => {
    assertProp(
      checker,
      bodyType,
      "metadata",
      "Record<string, string> | undefined",
    );
  });

  test("customer_email is optional", () => {
    assertProp(checker, bodyType, "customer_email", "string | undefined");
  });

  test("requiresShipping is optional", () => {
    assertProp(checker, bodyType, "requiresShipping", "boolean | undefined");
  });

  test("currency is optional", () => {
    assertProp(checker, bodyType, "currency", "string | undefined");
  });

  test("idempotencyKey is optional", () => {
    assertProp(checker, bodyType, "idempotencyKey", "string | undefined");
  });

  test("response exposes json", () => {
    expect(hasCallable(checker, resType, "json")).toBe(true);
  });

  test("response exposes status", () => {
    expect(hasCallable(checker, resType, "status")).toBe(true);
  });

  test("body not a ReadableStream", () => {
    expect(isAssignableToReadableStream(checker, bodyType)).toBe(false);
  });
});

