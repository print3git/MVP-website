// Re-export the CommonJS implementation to ensure Jest and TypeScript
// resolve the same module. Without the explicit file extension, ts-node
// resolves this file again, resulting in an empty module and `getEnv` being
// undefined during tests.
export { getEnv } from "./getEnv.js";
