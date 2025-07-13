let plugin;
try {
  // Optional dependency used only for TypeScript parsing in tests.
  plugin = require.resolve("@babel/plugin-syntax-typescript");
} catch {
  // When dependencies haven't been installed yet, provide a helpful warning
  // and fall back to an empty plugin list so Jest can still run.
  console.warn(
    "Optional '@babel/plugin-syntax-typescript' not found. Run 'npm run setup' to install.",
  );
}

module.exports = {
  plugins: plugin ? [plugin] : [],
};
