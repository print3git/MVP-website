import React, { useState } from 'https://esm.sh/react@18';

export default function useGenerateModel() {
  const [loading, setLoading] = useState(false);
  const [modelUrl, setModelUrl] = useState(null);
  const [error, setError] = useState(null);

  const generate = async (prompt, imageFile) => {
    setLoading(true);
    setError(null);
    setModelUrl(null);
    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      if (imageFile) formData.append('image', imageFile);
      const res = await fetch('/api/generate', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setModelUrl(data.glb_url);
    } catch (err) {
      setError(err.message || 'Error generating model');
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, modelUrl, error };
}
