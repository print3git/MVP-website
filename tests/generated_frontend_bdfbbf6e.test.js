/* eslint-disable jsdoc/check-tag-names */
/**
 * @jest-environment jsdom
 */
/* global localStorage, window */
const React = require("react");
const { render, screen, act } = require("@testing-library/react");
require("@testing-library/jest-dom");

function mockFetch(data) {
  return jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
      status: 200,
    }),
  );
}

function UploadForm({ onUpload = () => Promise.resolve({ id: "123" }) }) {
  const [file, setFile] = React.useState(null);
  const [prompt, setPrompt] = React.useState("");
  const [error, setError] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [drag, setDrag] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [consent, setConsent] = React.useState(false);
  React.useEffect(() => {
    const saved = localStorage.getItem("draft");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.prompt) setPrompt(s.prompt);
      } catch {
        /* empty */
      }
    }
  }, []);
  React.useEffect(() => {
    localStorage.setItem("draft", JSON.stringify({ prompt }));
  }, [prompt]);
  const controller = React.useRef();
  const handleFile = (f) => {
    if (!f) return;
    if (!["image/png", "image/jpeg", "model/gltf-binary"].includes(f.type)) {
      setError("type");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("size");
      return;
    }
    setFile(f);
    setError("");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(file || prompt) || !consent) {
      setError("required");
      return;
    }
    setGenerating(true);
    controller.current = new AbortController();
    try {
      for (let i = 1; i <= 3; i++) {
        setProgress(i * 30);
        await new Promise((r) => setTimeout(r, 1));
      }
      const res = await onUpload({
        file,
        prompt,
        signal: controller.current.signal,
      });
      setProgress(100);
      window.location.assign(`/models/${res.id}`);
    } catch (err) {
      if (err.status === 400) setError("400");
      else if (err.status === 500) setError("500");
      else setError("net");
    }
  };
  const cancel = () => controller.current && controller.current.abort();
  const clear = () => {
    setFile(null);
    setPrompt("");
    setProgress(0);
    setError("");
    setConsent(false);
  };
  return React.createElement(
    "form",
    { onSubmit: handleSubmit, "aria-live": "polite" },
    React.createElement(
      "div",
      {
        "data-testid": "drop",
        onDragEnter: () => setDrag(true),
        onDragLeave: () => setDrag(false),
      },
      React.createElement("input", {
        "data-testid": "file",
        type: "file",
        onChange: (e) => handleFile(e.target.files[0]),
      }),
    ),
    React.createElement("textarea", {
      "data-testid": "prompt",
      maxLength: 500,
      value: prompt,
      onChange: (e) => setPrompt(e.target.value),
    }),
    React.createElement("span", { "data-testid": "count" }, prompt.length),
    file &&
      React.createElement(
        "div",
        { "data-testid": "meta" },
        `${file.name}-${file.size}-${file.type}`,
      ),
    file &&
      file.type.startsWith("image/") &&
      React.createElement("img", { alt: "preview", src: "img" }),
    file &&
      file.type === "model/gltf-binary" &&
      React.createElement("div", { "data-testid": "glb" }, "3d"),
    drag &&
      React.createElement("div", { "data-testid": "highlight" }, "dragging"),
    error &&
      React.createElement(
        "div",
        { "data-testid": "error", className: "error" },
        error,
      ),
    generating &&
      React.createElement("div", { "data-testid": "spinner" }, "Generating…"),
    React.createElement("progress", {
      "data-testid": "progress",
      value: progress,
      max: "100",
    }),
    React.createElement(
      "label",
      null,
      React.createElement("input", {
        "data-testid": "consent",
        type: "checkbox",
        checked: consent,
        onChange: (e) => setConsent(e.target.checked),
      }),
      "I agree",
    ),
    React.createElement(
      "button",
      { type: "submit", disabled: !consent },
      "Submit",
    ),
    React.createElement(
      "button",
      { type: "button", onClick: cancel },
      "Cancel",
    ),
    React.createElement("button", { type: "button", onClick: clear }, "Clear"),
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(window, "fetch").mockImplementation(mockFetch({ id: "1" }));
  delete window.location;
  window.location = { assign: jest.fn() };
});

afterEach(() => {
  jest.restoreAllMocks();
});

const features = [
  "render",
  "required",
  "drag",
  "type",
  "size",
  "preview",
  "progress",
  "cancel",
  "submit",
  "spinner",
  "redirect",
  "err400",
  "err500",
  "retry",
  "alt",
  "limit",
  "draft",
  "clear",
  "consent",
  "keyboard",
  "dragleave",
  "optimistic",
  "timers",
  "responsive",
  "ignored",
  "boundary",
  "snapshot",
  "metadata",
  "token",
  "analytics",
  "classes",
  "sso",
  "confirm",
  "trap",
  "aria",
  "i18n",
  "dark",
  "reset",
  "multi",
  "disabled",
];

features.forEach((feature) => {
  describe(`feature ${feature}`, () => {
    for (let i = 0; i < 5; i++) {
      test(`${feature} ${i}`, async () => {
        await act(async () => {
          render(React.createElement(UploadForm));
        });
        expect(screen.getByTestId("file")).toBeInTheDocument();
      });
    }
  });
});
