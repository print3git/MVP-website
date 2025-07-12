require("../src/lib/uploadS3.js");

describe("AWS credentials", () => {
  test("dummy credentials are set", () => {
    expect(process.env.AWS_ACCESS_KEY_ID).toBeTruthy();
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBeTruthy();
  });
});
