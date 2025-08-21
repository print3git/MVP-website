function modelFactory(overrides = {}) {
  return {
    prompt: "test prompt",
    fileKey: "file.glb",
    ...overrides,
  };
}

module.exports = { modelFactory };
