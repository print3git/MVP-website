#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const dir = path.join(process.cwd(), "frontend");
if (!fs.existsSync(dir)) {
  process.exit(0);
}

const pkgPath = path.join(dir, "package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.scripts ||= {};
  if (!pkg.scripts.build) pkg.scripts.build = "vite build";
  if (!pkg.scripts.preview) pkg.scripts.preview = "vite preview";
  pkg.devDependencies ||= {};
  if (!pkg.devDependencies.vite) pkg.devDependencies.vite = "^5.4.19";
  if (!pkg.devDependencies["@vitejs/plugin-react"])
    pkg.devDependencies["@vitejs/plugin-react"] = "^5.0.1";
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

const cfgPath = path.join(dir, "vite.config.ts");
if (!fs.existsSync(cfgPath)) {
  fs.writeFileSync(
    cfgPath,
    `import { defineConfig } from "vite";\n` +
      `import react from "@vitejs/plugin-react";\n\n` +
      `export default defineConfig({\n` +
      `  plugins: [react()],\n` +
      `});\n`,
  );
}

const htmlPath = path.join(dir, "index.html");
if (!fs.existsSync(htmlPath)) {
  fs.writeFileSync(
    htmlPath,
    `<!DOCTYPE html>\n` +
      `<html lang="en">\n` +
      `  <head>\n` +
      `    <meta charset="UTF-8" />\n` +
      `    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n` +
      `    <title>Vite App</title>\n` +
      `  </head>\n` +
      `  <body>\n` +
      `    <div id="root"></div>\n` +
      `    <script type="module" src="/src/main.tsx"></script>\n` +
      `  </body>\n` +
      `</html>\n`,
  );
}
