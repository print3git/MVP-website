const { test, expect } = require("@playwright/test");
const messagesKey = Symbol("browserMessages");

test.beforeEach(({ page }, testInfo) => {
  const messages = [];
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      messages.push(`console.${type}: ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    messages.push(`uncaught exception: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure();
    messages.push(
      `request failed: ${request.url()} - ${failure && failure.errorText}`,
    );
  });
  testInfo[messagesKey] = messages;
});

test.afterEach(async ({}, testInfo) => {
  const messages = testInfo[messagesKey] || [];
  if (messages.length) {
    // eslint-disable-next-line no-console
    console.error("Browser errors/warnings:", messages.join("\n"));
    throw new Error(messages.join("\n"));
  }
});
