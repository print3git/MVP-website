const critical = [
  "SPARC3D_TOKEN",
  "CLOUDFRONT_MODEL_DOMAIN",
  "STABILITY_KEY",
  "HF_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DB_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

function snapshotEnv() {
  const out = {};
  for (const key of critical) {
    out[key] = process.env[key] ? "<set>" : undefined;
  }
  return out;
}

describe("env stability snapshot", () => {
  test("matches baseline and required vars present", () => {
    const snap = snapshotEnv();
    console.log("env snapshot", JSON.stringify(snap, null, 2));
    expect(snap.SPARC3D_TOKEN).toBe("<set>");
    expect(snap.CLOUDFRONT_MODEL_DOMAIN).toBe("<set>");
    expect(snap).toMatchSnapshot();
  });
});
