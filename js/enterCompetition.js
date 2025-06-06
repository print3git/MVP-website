async function loadModels() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  const select = document.getElementById('modelSelect');
  const errorEl = document.getElementById('error');
  try {
    const res = await fetch('/api/my/models', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('bad');
    const models = await res.json();
    models.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m.job_id;
      opt.textContent = m.prompt || m.job_id;
      select.appendChild(opt);
    });
  } catch {
    errorEl.textContent = 'Failed to load models';
  }
}

async function submitEntry(e) {
  e.preventDefault();
  const select = document.getElementById('modelSelect');
  const errorEl = document.getElementById('error');
  select.classList.remove('border-red-500');
  errorEl.textContent = '';
  const modelId = select.value;
  if (!modelId) {
    errorEl.textContent = 'Please select a model';
    select.classList.add('border-red-500');
    return;
  }
  const token = localStorage.getItem('token');
  const params = new URLSearchParams(window.location.search);
  const compId = params.get('id');
  try {
    const res = await fetch(`/api/competitions/${compId}/enter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ modelId }),
    });
    if (res.ok) {
      errorEl.classList.remove('text-red-400');
      errorEl.classList.add('text-green-400');
      errorEl.textContent = 'Entry submitted!';
    } else {
      const data = await res.json().catch(() => ({}));
      errorEl.textContent = data.error || 'Submission failed';
      select.classList.add('border-red-500');
    }
  } catch {
    errorEl.textContent = 'Submission failed';
  }
}

document.addEventListener('DOMContentLoaded', loadModels);
document.getElementById('entryForm').addEventListener('submit', submitEntry);
