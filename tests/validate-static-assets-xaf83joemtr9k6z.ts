import fs from "fs";
import path from "path";
import { execSync } from "child_process";

describe("static asset validation", () => {
  test("build output contains required files", () => {
    execSync("npm run build", { stdio: "inherit" });

    const buildDir = path.resolve(__dirname, "..");
    const indexPath = path.join(buildDir, "index.html");
    expect(fs.existsSync(indexPath)).toBe(true);

    const bundlePatterns = ["*.js", "*.css"];
    const hasBundle = bundlePatterns.some((pattern) => {
      const files = fs
        .readdirSync(buildDir)
        .filter((f) => new RegExp(pattern.replace("*", ".*")).test(f));
      return files.length > 0;
    });
    expect(hasBundle).toBe(true);

    const assetExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".glb",
      ".mp3",
      ".wav",
    ];
    const foundAsset = fs
      .readdirSync(buildDir)
      .some((f) => assetExtensions.some((ext) => f.endsWith(ext)));
    expect(foundAsset).toBe(true);
  });
});
