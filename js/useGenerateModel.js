import React, { useState } from 'https://esm.sh/react@18';
import useJobPolling from './useJobPolling.js';

export default function useGenerateModel() {
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const { status, glbUrl, error: pollError } = useJobPolling(jobId);

  const generate = async (prompt, imageFile) => {
    setLoading(true);
    setError(null);
    setJobId(null);
    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      if (imageFile) formData.append('image', imageFile);
      const res = await fetch('/api/generate', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      const id = data.jobId || data.job_id;
      if (id) {
        setJobId(id);
      } else if (data.glb_url) {
        setJobId(null);
        return data.glb_url;
      }
    } catch (err) {
      setError(err.message || 'Error generating model');
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, status, modelUrl: glbUrl, jobId, error: error || pollError };
}
