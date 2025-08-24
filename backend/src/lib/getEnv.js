function getEnv(name, options = {}) {
  const { required = false, defaultValue } = options;
  let value = process.env[name];
  if (value === undefined || value === "") {
    if (defaultValue !== undefined) return defaultValue;
    if (required) {
      throw new Error(`Environment variable ${name} is required`);
    }
    return undefined;
  }
  return value;
}
module.exports = { getEnv };
