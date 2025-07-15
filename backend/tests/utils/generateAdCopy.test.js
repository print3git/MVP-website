const axios = require("axios");
jest.mock("axios");

// mock templates
jest.mock("../../ad_templates.json", () => [
  { template: "Ad for {subreddit}" },
]);

const generateAdCopy = require("../../utils/generateAdCopy");

describe("generateAdCopy", () => {
  const originalEnv = process.env.LLM_API_URL;

  afterEach(() => {
    process.env.LLM_API_URL = originalEnv;
    jest.clearAllMocks();
  });

  test("returns template text when API url not set", async () => {
    delete process.env.LLM_API_URL;
    Math.random = jest.fn(() => 0); // pick first template
    const text = await generateAdCopy("foo");
    expect(text).toBe("Ad for foo");
  });

  test("uses API when url set", async () => {
    process.env.LLM_API_URL = "http://api";
    axios.post.mockResolvedValue({ data: { text: " Hello " } });
    const text = await generateAdCopy("bar", "context");
    expect(axios.post).toHaveBeenCalledWith("http://api", {
      prompt: "Write a short advert for r/bar. Context: context",
    });
    expect(text).toBe("Hello");
  });

  test("falls back to template on error", async () => {
    process.env.LLM_API_URL = "http://api";
    axios.post.mockRejectedValue(new Error("fail"));
    Math.random = jest.fn(() => 0);
    console.error.mockImplementation(() => {});
    const text = await generateAdCopy("baz");
    expect(text).toBe("Ad for baz");
  });

  test("uses template when API response missing text", async () => {
    process.env.LLM_API_URL = "http://api";
    axios.post.mockResolvedValue({ data: {} });
    Math.random = jest.fn(() => 0);
    const text = await generateAdCopy("qux");
    expect(text).toBe("Ad for qux");
  });

  test("handles undefined context", async () => {
    process.env.LLM_API_URL = "http://api";
    axios.post.mockResolvedValue({ data: { text: "Res" } });
    const text = await generateAdCopy("sub");
    expect(axios.post).toHaveBeenCalledWith("http://api", {
      prompt: "Write a short advert for r/sub. Context: ",
    });
    expect(text).toBe("Res");
  });
});
