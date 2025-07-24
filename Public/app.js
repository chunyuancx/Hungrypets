document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const planEditBtn     = document.getElementById('planEditBtn');
  const planSaveBtn     = document.getElementById('planSaveBtn');
  const dispenseBtn     = document.getElementById('dispenseBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const scheduleList    = document.getElementById('scheduleList');
  const historyTable    = document.getElementById('historyTable');
  const timeInput       = document.getElementById('timeInput');
  const levelBarFill    = document.getElementById('levelBarFill');
  const levelText       = document.getElementById('levelText');
  const notification    = document.getElementById('notification');

  // State
  let schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
  let logs      = JSON.parse(localStorage.getItem('logs')      || '[]');
  let editMode  = false;
  let fired     = new Set();

  const saveState = () => {
    localStorage.setItem('schedules', JSON.stringify(schedules));
    localStorage.setItem('logs',      JSON.stringify(logs));
  };

  // HH:MM → h:MM AM/PM
  const formatTime12 = t24 => {
    const [h,m] = t24.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12    = ((h + 11) % 12) + 1;
    return `${h12}:${m.toString().padStart(2,'0')} ${suffix}`;
  };

  // Show notification for 5s
  function showNotification(msg) {
    notification.textContent = msg;
    notification.classList.add('show');
    setTimeout(() => {
      notification.classList.remove('show');
    }, 5000);
  }

  // Render Meal Plan
  function renderSchedules() {
    if (!schedules.length) {
      scheduleList.innerHTML = '<li class="list-group-item p-1">-</li>';
      return;
    }
    scheduleList.innerHTML = schedules
      .slice().sort()
      .map((t,i) => {
        const del = editMode
          ? `<button class="delete-btn btn btn-sm btn-outline-danger" data-idx="${i}">×</button>`
          : '';
        return `<li class="list-group-item d-flex align-items-center">
                  ${del}<span>${formatTime12(t)}</span>
                </li>`;
      }).join('');
    if (editMode) {
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
          schedules.splice(+btn.dataset.idx, 1);
          saveState();
          renderSchedules();
        };
      });
    }
  }

  // Render Feed Record
  function renderHistory() {
    if (!logs.length) {
      historyTable.innerHTML = '<tr><td>-</td><td>-</td></tr>';
    } else {
      historyTable.innerHTML = logs.map(r => `
        <tr><td>${new Date(r.ts).toLocaleTimeString()}</td><td>${r.level}</td></tr>
      `).join('');
    }
  }

  clearHistoryBtn.onclick = () => {
    logs = [];
    saveState();
    renderHistory();
  };

  // Fetch current level
  async function fetchLevel() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw 0;
      return (await res.json()).food_level;
    } catch {
      return null;
    }
  }

  // Update bar + text
  async function updateLevel() {
    const lvl = await fetchLevel();
    if (lvl !== null) {
      const pct = Math.max(0, Math.min(100, lvl));
      levelBarFill.style.width      = pct + '%';
      levelBarFill.style.background = pct <= 30 ? '#dc3545' : '#4caf50';
      levelText.textContent         = pct + '%';
    }
  }

  // Auto‐log at schedule
  async function checkSchedules() {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2,'0');
    const mm = now.getMinutes().toString().padStart(2,'0');
    const key = `${hh}:${mm}`;
    if (schedules.includes(key) && !fired.has(key)) {
      fired.add(key);
      const lvl  = await fetchLevel();
      const text = lvl === null ? '-' : (lvl <= 30 ? 'Low' : 'Filled');
      logs.unshift({ ts: Date.now(), level: text });
      if (logs.length > 50) logs.pop();
      saveState();
      renderHistory();
    }
  }
  // sync to next minute
  const nowDate = new Date();
  setTimeout(() => {
    checkSchedules();
    setInterval(checkSchedules, 60000);
  }, (60 - nowDate.getSeconds()) * 1000 + 50);

  // Initial draw & polling
  renderSchedules();
  renderHistory();
  updateLevel();
  setInterval(updateLevel, 10000);

  // Toggle edit mode
  planEditBtn.onclick = () => {
    editMode = !editMode;
    planEditBtn.classList.toggle('btn-outline-secondary', !editMode);
    planEditBtn.classList.toggle('btn-secondary', editMode);
    renderSchedules();
  };

  // Save new time
  planSaveBtn.onclick = () => {
    const t = timeInput.value;
    if (!t) return;
    schedules.push(t);
    saveState();
    renderSchedules();
    timeInput.value = '';
  };

  // Dispense Now + slide-down notification
  dispenseBtn.onclick = async () => {
    await fetch('/api/dispense', { method: 'POST' }).catch(() => {});
    const lvl  = await fetchLevel();
    const text = lvl === null ? '-' : (lvl <= 30 ? 'Low' : 'Filled');
    logs.unshift({ ts: Date.now(), level: text });
    if (logs.length > 50) logs.pop();
    saveState();
    renderHistory();
    showNotification('Food have been dispense! 👅');
  };
});
