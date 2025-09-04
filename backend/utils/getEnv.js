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

// Support both CommonJS default and named imports
module.exports = getEnv;
module.exports.getEnv = getEnv;
