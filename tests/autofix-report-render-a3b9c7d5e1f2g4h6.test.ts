const { generateReport } = require("../scripts/generate-autofix-report");

describe("autofix report", () => {
  it("renders all fields", () => {
    const md = generateReport({
      openIssues: 1,
      newIssues: 2,
      prsOpened: 3,
      prsMerged: 4,
      prsClosed: 5,
    });
    expect(md).toContain("| Open issues | 1 |");
    expect(md).toContain("| New issues | 2 |");
    expect(md).toContain("| PRs opened | 3 |");
    expect(md).toContain("| PRs merged | 4 |");
    expect(md).toContain("| PRs closed | 5 |");
    expect(md).toMatch(/Generated at:/);
    expect(md).not.toMatch(/undefined/);
  });
});
