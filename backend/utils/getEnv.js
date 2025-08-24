function getEnv(name, options = {}) {
  const { required = false, default: defaultValue } = options;
  const value = process.env[name];
  if (value !== undefined && value !== "") {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  if (required) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return undefined;
}

module.exports = { getEnv };
