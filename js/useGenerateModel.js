import React, { useState } from "react";
import toast from "./toast.js";

export default function useGenerateModel() {
  const [loading, setLoading] = useState(false);
  const [modelUrl, setModelUrl] = useState(null);
  const [position, setPosition] = useState(null);
  const generate = async (prompt) => {
    setLoading(true);
    setModelUrl(null);
    setPosition(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      let state = "queued";
      let status;
      while (state === "queued" || state === "running") {
        const resStatus = await fetch(`/api/status/${data.jobId}`);
        status = await resStatus.json();
        state = status.state;
        setPosition(status.position ?? null);
        if (state === "queued" || state === "running") {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (state === "succeeded" && status.url) {
        setModelUrl(status.url);
      } else {
        throw new Error(status.error || "failed");
      }
    } catch (err) {
      toast("Model generation failed. Please try again.");
    } finally {
      setLoading(false);
      setPosition(null);
    }
  };

  return { generate, loading, modelUrl, position };
}
