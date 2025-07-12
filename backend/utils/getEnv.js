function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    const message = `Missing required environment variable ${name}`;
    if (process.env.NODE_ENV !== "test") {
      console.error(message);
    }
  }
  return value;
}

module.exports = { getEnv };
