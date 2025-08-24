module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "build",
        "ci",
        "docs",
        "feat",
        "fix",
        "chore",
        "refactor",
        "test",
        "style",
        "perf",
        "revert",
      ],
    ],
  },
};
