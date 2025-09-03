// Explicitly reference the JavaScript implementation to avoid Jest's
// module resolution from picking this TypeScript file again and creating
// a self-referential import cycle. Without the extension Jest resolves
// `./getEnv` to this file, causing `getEnv` to be undefined at runtime.
//
// Using the .js extension ensures the CommonJS module is loaded and the
// named export is preserved.
export { getEnv } from "./getEnv.js";
