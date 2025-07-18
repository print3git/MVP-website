const { spawnSync } = require("child_process");
const { JSDOM } = require("jsdom");

function mockShellHandler(input) {
  const sanitized = input.replace(/[^a-zA-Z0-9._-]/g, "");
  return spawnSync("echo", [sanitized], { encoding: "utf8" }).stdout.trim();
}

describe("Shell command injection", () => {
  test("rejects unsanitized input", () => {
    expect(mockShellHandler("$(echo hacked)")).not.toBe("hacked");
  });
});

describe("Improper input escaping", () => {
  function escape(str) {
    return str.replace(/[\\"*]/g, "\\$&");
  }
  test("escapes regex characters", () => {
    const re = new RegExp(escape("foo.*"));
    expect(re.test("foo.*")).toBe(true);
    expect(re.test("foo123")).toBe(false);
  });
  test("escapes HTML when inserting to DOM", () => {
    const dom = new JSDOM('<div id="app"></div>');
    const div = dom.window.document.getElementById("app");
    const payload = '<script>alert("x")</script>';
    div.textContent = payload;
    expect(div.innerHTML).toBe('&lt;script&gt;alert("x")&lt;/script&gt;');
  });
});

describe("Insecure download logic", () => {
  function download(url) {
    if (!/^https:/.test(url)) {
      throw new Error("Insecure URL");
    }
    return true;
  }
  test("rejects insecure URLs", () => {
    expect(() => download("http://example.com/file")).toThrow("Insecure URL");
    expect(download("https://example.com/file")).toBe(true);
  });
});

describe("Raw HTML injection", () => {
  test("content inserted into DOM is encoded", () => {
    const dom = new JSDOM('<div id="root"></div>');
    const el = dom.window.document.getElementById("root");
    const dangerous = "<img src=x onerror=alert(1) />";
    el.textContent = dangerous;
    expect(el.innerHTML).toBe('&lt;img src="x" onerror="alert(1)" /&gt;');
  });
});
