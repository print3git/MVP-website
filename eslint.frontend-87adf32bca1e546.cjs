const react = require("eslint-plugin-react");
const jsxA11y = require("eslint-plugin-jsx-a11y");
const noInlineStyles = require("eslint-plugin-no-inline-styles");
const ts = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const htmlPlugin = require("@html-eslint/eslint-plugin");
const htmlParser = require("@html-eslint/parser");
const frontendRules = require("./scripts/eslint-frontend-rules");
const globals = require("globals");
const ssrFriendly = require("eslint-plugin-ssr-friendly");

// Polyfill for ESLint v9 where context.getScope was removed
const originalNoDomGlobalsRule =
  ssrFriendly.rules["no-dom-globals-in-module-scope"];
ssrFriendly.rules["no-dom-globals-in-module-scope"] = {
  ...originalNoDomGlobalsRule,
  create(context) {
    if (typeof context.getScope !== "function") {
      // eslint-disable-next-line no-param-reassign
      context.getScope = () => context.sourceCode.scopeManager.globalScope;
    }
    return originalNoDomGlobalsRule.create(context);
  },
};

module.exports = [
  {
    files: ["js/**/*.{js,jsx}", "src/**/*.{js,jsx,tsx,ts}"],
    ignores: ["**/*.min.js"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        project: ["./tsconfig.base.json"],
        tsconfigRootDir: __dirname,
      },
      globals: { ...globals.browser },
    },
    plugins: {
      react,
      jsxA11y,
      "no-inline-styles": noInlineStyles,
      frontendRules,
      "@typescript-eslint": ts,
    },
    rules: {
      "no-console": "error",
      "no-inline-styles/no-inline-styles": "error",
      "frontendRules/no-hardcoded-colors": [
        "error",
        {
          tokens: [
            "var(--color-black)",
            "var(--color-white)",
            "var(--color-red)",
            "var(--color-blue)",
            "var(--color-green)",
          ],
        },
      ],
      "frontendRules/button-requires-aria": "error",
      "frontendRules/controlled-input": "error",
      "frontendRules/no-deprecated-html-tags": "error",
    },
  },
  {
    files: ["frontend/src/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        project: ["./tsconfig.base.json"],
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.es2023,
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
      },
    },
    plugins: {
      react,
      jsxA11y,
      "no-inline-styles": noInlineStyles,
      frontendRules,
      "@typescript-eslint": ts,
      "ssr-friendly": ssrFriendly,
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-undef": "error",
      "no-inline-styles/no-inline-styles": "error",
      "frontendRules/no-hardcoded-colors": [
        "error",
        {
          tokens: [
            "var(--color-black)",
            "var(--color-white)",
            "var(--color-red)",
            "var(--color-blue)",
            "var(--color-green)",
          ],
        },
      ],
      "frontendRules/button-requires-aria": "error",
      "frontendRules/controlled-input": "error",
      "frontendRules/no-deprecated-html-tags": "error",
      "ssr-friendly/no-dom-globals-in-module-scope": "error",
      "ssr-friendly/no-dom-globals-in-constructor": "error",
      "ssr-friendly/no-dom-globals-in-react-cc-render": "error",
      "ssr-friendly/no-dom-globals-in-react-fc": "error",
    },
  },
  {
    files: ["*.html", "frontend/**/*.html"],
    languageOptions: {
      parser: htmlParser,
      globals: {
        ...globals.browser,
        ...globals.es2023,
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
      },
    },
    plugins: {
      html: htmlPlugin,
      "no-inline-styles": noInlineStyles,
      frontendRules,
    },
    rules: {
      "no-inline-styles/no-inline-styles": "error",
      "frontendRules/no-hardcoded-colors": [
        "error",
        {
          tokens: [
            "var(--color-black)",
            "var(--color-white)",
            "var(--color-red)",
            "var(--color-blue)",
            "var(--color-green)",
          ],
        },
      ],
      "frontendRules/button-requires-aria": "error",
      "frontendRules/controlled-input": "error",
      "frontendRules/no-deprecated-html-tags": "error",
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: {
      "@typescript-eslint": ts,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];
