const mod = require("../../scripts/fetch-assets.cjs");
mod.download = async () => {
  throw new Error("forced failure");
};
