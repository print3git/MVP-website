const { env } = process;

describe("proxy environment", () => {
  test("npm http proxy variables are unset", () => {
    expect(
      env.npm_config_http_proxy || env.npm_config_https_proxy,
    ).toBeUndefined();
  });
});
