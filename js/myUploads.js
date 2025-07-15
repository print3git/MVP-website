import React, { useEffect, useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";

function MyUploads() {
  const [files, setFiles] = useState(null);

  useEffect(() => {
    fetch("/api/models")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFiles(data))
      .catch(() => setFiles([]));
  }, []);

  if (files === null) {
    return React.createElement("p", null, "Loading...");
  }

  if (!files.length) {
    return React.createElement("p", null, "No uploads found");
  }

  return React.createElement(
    "ul",
    { className: "space-y-2" },
    files.map((f) =>
      React.createElement(
        "li",
        { key: f.id, className: "flex justify-between" },
        f.public_url
          ? React.createElement(
              "a",
              { href: f.public_url, className: "text-blue-400 underline" },
              f.name,
            )
          : React.createElement("span", null, f.name),
        React.createElement(
          "span",
          { className: "text-sm text-gray-400" },
          new Date(f.created_at).toLocaleString(),
        ),
      ),
    ),
  );
}

const root = document.getElementById("app");
createRoot(root).render(React.createElement(MyUploads));
