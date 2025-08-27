import React, { useState } from "react";
import toast from "./toast.js";

export default function useGenerateModel() {
  const [loading, setLoading] = useState(false);
  const [modelUrl, setModelUrl] = useState(null);
  const generate = async (prompt) => {
    setLoading(true);
    setModelUrl(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      if (data.url) {
        setModelUrl(data.url);
      } else {
        let state = "running";
        let status;
        while (state === "running") {
          const resStatus = await fetch(`/api/status/${data.jobId}`);
          status = await resStatus.json();
          state = status.state;
        }
        if (state === "succeeded" && status.url) {
          setModelUrl(status.url);
        } else {
          throw new Error("failed");
        }
      }
    } catch (err) {
      toast("Model generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, modelUrl };
}
