module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": ["babel-jest", { presets: ["@babel/preset-typescript"] }],
  },
};
