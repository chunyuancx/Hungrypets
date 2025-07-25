document.addEventListener('DOMContentLoaded', () => {
  // Element refs
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

  // Persist state
  function saveState() {
    localStorage.setItem('schedules', JSON.stringify(schedules));
    localStorage.setItem('logs',      JSON.stringify(logs));
  }

  // HH:MM → h:MM AM/PM
  function formatTime12(t24) {
    const [h,m] = t24.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12    = ((h + 11) % 12) + 1;
    return `${h12}:${m.toString().padStart(2,'0')} ${suffix}`;
  }

  // Slide-down notification
  function showNotification(msg) {
    notification.textContent = msg;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 5000);
  }

  // Render schedules
  function renderSchedules() {
    if (!schedules.length) {
      scheduleList.innerHTML = '<li class="list-group-item p-1">-</li>';
      return;
    }
    scheduleList.innerHTML = schedules
      .slice().sort()
      .map((t,i) => {
        const del = editMode
          ? `<button class="delete-btn btn btn-sm btn-outline-danger me-2" data-idx="${i}">×</button>`
          : '';
        return `<li class="list-group-item d-flex align-items-center">
                  ${del}<span>${formatTime12(t)}</span>
                </li>`;
      }).join('');
    if (editMode) {
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
          schedules.splice(+btn.dataset.idx,1);
          saveState();
          renderSchedules();
        };
      });
    }
  }

  // Render history
  function renderHistory() {
    if (!logs.length) {
      historyTable.innerHTML = '<tr><td>-</td><td>-</td></tr>';
      return;
    }
    historyTable.innerHTML = logs.map(r => `
      <tr>
        <td>${new Date(r.ts).toLocaleTimeString()}</td>
        <td>${r.level}</td>
      </tr>
    `).join('');
  }

  // Clear history
  clearHistoryBtn.onclick = () => {
    logs = [];
    saveState();
    renderHistory();
  };

  // Fetch level
  async function fetchLevel() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw 0;
      return (await res.json()).food_level;
    } catch {
      return null;
    }
  }

  // Update bar
  async function updateLevel() {
    const lvl = await fetchLevel();
    if (lvl !== null) {
      const pct = Math.max(0, Math.min(100, lvl));
      levelBarFill.style.width      = pct + '%';
      levelBarFill.style.background = pct <= 30 ? '#dc3545' : '#4caf50';
      levelText.textContent         = pct + '%';
    }
  }

  // Auto-dispatch
  async function checkSchedules() {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2,'0');
    const mm = now.getMinutes().toString().padStart(2,'0');
    const key = `${hh}:${mm}`;
    if (schedules.includes(key) && !fired.has(key)) {
      fired.add(key);
      await fetch('/api/dispense',{method:'POST'}).catch(()=>{});
      const lvl = await fetchLevel();
      const text = lvl===null ? '-' : (lvl<=30?'Low':'Filled');
      logs.unshift({ts:Date.now(),level:text});
      if (logs.length>50) logs.pop();
      saveState();
      renderHistory();
      showNotification('Food have been dispense! 👅');
    }
  }

  // Schedule checks
  const nowDate = new Date();
  setTimeout(() => {
    checkSchedules();
    setInterval(checkSchedules,60000);
  }, (60-nowDate.getSeconds())*1000 + 50);

  // Initial load
  renderSchedules();
  renderHistory();
  updateLevel();
  setInterval(updateLevel,2000);

  // Toggle edit
  planEditBtn.onclick = () => {
    editMode = !editMode;
    planEditBtn.classList.toggle('btn-outline-secondary', !editMode);
    planEditBtn.classList.toggle('btn-secondary', editMode);
    renderSchedules();
  };

  // Save button + notification
  planSaveBtn.onclick = () => {
    const t = timeInput.value;
    if (!t) return;
    schedules.push(t);
    saveState();
    renderSchedules();
    timeInput.value = '';
    showNotification('Meal Plan have been saved');
  };

  // Manual dispense
  dispenseBtn.onclick = async () => {
    await fetch('/api/dispense',{method:'POST'}).catch(()=>{});
    const lvl = await fetchLevel();
    const text = lvl===null ? '-' : (lvl<=30?'Low':'Filled');
    logs.unshift({ts:Date.now(),level:text});
    if (logs.length>50) logs.pop();
    saveState();
    renderHistory();
    showNotification('Food have been dispense! 👅');
  };
});
