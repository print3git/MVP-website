const https = require("https");

const owner = process.env.CI_REPO_OWNER || "print3git";
const repo = process.env.CI_REPO_NAME || "MVP-website";
const token = process.env.GITHUB_TOKEN;

(token ? test : test.skip)(
  "github repository has code scanning enabled",
  (done) => {
    const options = {
      hostname: "api.github.com",
      path: `/repos/${owner}/${repo}/code-scanning/alerts`,
      headers: {
        "User-Agent": "codeql-test",
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
      },
    };
    https
      .get(options, (res) => {
        expect(res.statusCode).not.toBe(404);
        res.resume();
        done();
      })
      .on("error", done);
  },
);
