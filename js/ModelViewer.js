import React, { useState, Suspense } from "https://esm.sh/react@18";
import { Canvas } from "https://esm.sh/@react-three/fiber@8";
import { Gltf } from "https://esm.sh/@react-three/drei@9";

export default function ModelViewer({ url }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return React.createElement(
    "div",
    { className: "relative w-full h-64" },
    React.createElement(
      Canvas,
      {
        style: { width: "100%", height: "100%" },
        onCreated: () => setLoaded(true),
      },
      React.createElement(
        Suspense,
        { fallback: null },
        React.createElement(Gltf, { src: url, onError: () => setError(true) }),
      ),
    ),
    !loaded &&
      !error &&
      React.createElement(
        "div",
        {
          className:
            "absolute inset-0 flex items-center justify-center bg-black/20",
        },
        React.createElement("div", {
          className:
            "h-8 w-8 border-4 border-white border-t-transparent rounded-full animate-spin",
        }),
      ),
    error &&
      React.createElement(
        "div",
        {
          className:
            "absolute inset-0 flex items-center justify-center bg-black text-white",
        },
        "Failed to load model",
      ),
  );
}
