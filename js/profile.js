async function load() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  const urlParams = new URLSearchParams(window.location.search);
  const user = urlParams.get('user');
  let endpoint = '/api/my/models';
  if (user) endpoint = `/api/users/${encodeURIComponent(user)}/models`;
  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const models = await res.json();
  const container = document.getElementById('models');
  container.innerHTML = '';
  models.forEach((m) => {
    const div = document.createElement('div');
    div.className =
      'bg-[#2A2A2E] border border-white/10 rounded-3xl p-4 flex justify-between items-center';
    div.innerHTML = `<span>${m.prompt} - ${m.model_url || ''}</span><span>${m.likes} ❤️</span>`;
    if (!user) {
      const btn = document.createElement('button');
      btn.textContent = m.is_public ? 'Make Private' : 'Make Public';
      btn.className = 'ml-2 text-xs bg-blue-600 px-2 rounded';
      btn.addEventListener('click', async () => {
        const res = await fetch(`/api/models/${m.job_id}/public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isPublic: !m.is_public }),
        });
        if (res.ok) {
          m.is_public = !m.is_public;
          btn.textContent = m.is_public ? 'Make Private' : 'Make Public';
        }
      });
      div.appendChild(btn);
    }
    container.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', load);
