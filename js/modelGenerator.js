import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import useGenerateModel from "./useGenerateModel.js";
import ModelViewer from "./ModelViewer.js";

export function GeneratorApp() {
  const [prompt, setPrompt] = useState("");
  const { generate, loading, modelUrl, position } = useGenerateModel();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await generate(prompt);
  };

  return React.createElement(
    "div",
    { className: "space-y-4" },
    React.createElement(
      "form",
      { onSubmit: handleSubmit, className: "space-y-2" },
      React.createElement("input", {
        id: "gen-prompt",
        type: "text",
        value: prompt,
        onChange: (e) => setPrompt(e.target.value),
        className: "border p-2 w-full text-black",
        placeholder: "Enter prompt",
        required: true,
      }),
      React.createElement(
        "button",
        {
          id: "gen-submit",
          type: "submit",
          className: "px-4 py-2 bg-blue-600 text-white rounded",
          disabled: loading,
          "data-testid": "generate-btn",
        },
        loading ? "Generating..." : "Generate 3D",
      ),
    ),
    loading &&
      React.createElement(
        "div",
        { "data-testid": "queue-state" },
        React.createElement("div", {
          className:
            "animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full",
        }),
        position !== null &&
          React.createElement(
            "p",
            { className: "mt-2" },
            `Position: ${position}`,
          ),
      ),
    modelUrl &&
      React.createElement(
        "div",
        { "data-testid": "viewer" },
        React.createElement(ModelViewer, { url: modelUrl }),
      ),
  );
}

const rootEl = document.getElementById("gen-app");
if (rootEl) {
  createRoot(rootEl).render(React.createElement(GeneratorApp));
}
