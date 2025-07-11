import { useEffect, useRef, useState } from 'https://esm.sh/react@18';
export default function useJobPolling(jobId) {
  const [status, setStatus] = useState(null);
  const [glbUrl, setGlbUrl] = useState(null);
  const [error, setError] = useState(null);
  const timer = useRef(null);
  useEffect(() => {
    if (!jobId) return;
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        setStatus(data.status);
        if (data.status === 'complete') {
          setGlbUrl(data.model_url);
          clearInterval(timer.current);
        }
      } catch (err) {
        setError(err.message || 'Error fetching status');
        clearInterval(timer.current);
      }
    }
    fetchStatus();
    timer.current = setInterval(fetchStatus, 2000);
    return () => clearInterval(timer.current);
  }, [jobId]);
  return { status, glbUrl, error };
}
