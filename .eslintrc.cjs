module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.eslint.json"],
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ["backend/**", "frontend/**", "dist/**", "scripts/**/*.js"],
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      extends: [
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
      rules: { "no-undef": "off" },
    },
    {
      files: ["**/*.js"],
      parserOptions: { project: null },
    },
  ],
};
