// Element references
const planSaveBtn     = document.getElementById('planSaveBtn');
const dispenseBtn     = document.getElementById('dispenseBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const scheduleList    = document.getElementById('scheduleList');
const historyTable    = document.getElementById('historyTable');
const timeInput       = document.getElementById('timeInput');
const levelBanner     = document.getElementById('levelBanner');
const alertBanner     = document.getElementById('alertBanner');
const currentLevel    = document.getElementById('currentLevel');

// Load state
let schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
let logs      = JSON.parse(localStorage.getItem('logs')      || '[]');

// Save state
function saveState() {
  localStorage.setItem('schedules', JSON.stringify(schedules));
  localStorage.setItem('logs',      JSON.stringify(logs));
}

// Render the meal-plan list
function renderSchedules() {
  if (!schedules.length) {
    scheduleList.innerHTML = '<li class="list-group-item p-1">-</li>';
  } else {
    scheduleList.innerHTML = schedules
      .slice().sort()
      .map(t => `<li class="list-group-item p-1">${t}</li>`)
      .join('');
  }
}

// Render the feed-record table
function renderHistory() {
  if (!logs.length) {
    historyTable.innerHTML = `
      <tr><td>-</td><td>-</td></tr>
    `;
  } else {
    historyTable.innerHTML = logs.map(r => `
      <tr>
        <td>${new Date(r.ts).toLocaleTimeString()}</td>
        <td>${r.level}</td>
      </tr>
    `).join('');
  }
}

// Clear history handler
clearHistoryBtn.onclick = () => {
  logs = [];
  saveState();
  renderHistory();
};

// Fetch current food level from Pi
async function fetchLevel() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw 0;
    const { food_level } = await res.json();
    return food_level;
  } catch {
    return null;
  }
}

// Update top banners
function updateLevel(lvl) {
  const low = lvl !== null && lvl <= 20;
  currentLevel.textContent = lvl === null ? '—' : (low ? 'Low' : 'Filled');
  levelBanner.classList.toggle('alert-danger', low);
  levelBanner.classList.toggle('alert-info',  !low);
  alertBanner.style.display = low ? 'block' : 'none';
}

// Poll the level every 10s
setInterval(async () => {
  const lvl = await fetchLevel();
  updateLevel(lvl);
}, 10000);
// Initial fetch
(async () => {
  const lvl = await fetchLevel();
  updateLevel(lvl);
})();

// Meal plan Save handler
planSaveBtn.onclick = () => {
  const t = timeInput.value;
  if (!t) return;
  schedules.push(t);
  saveState();
  renderSchedules();
  timeInput.value = '';
};

// Dispense Now handler
dispenseBtn.onclick = async () => {
  await fetch('/api/dispense', { method: 'POST' }).catch(() => {});
  const lvl = await fetchLevel();
  const text = lvl === null ? 'Failed' : (lvl <= 20 ? 'Low' : 'Filled');
  logs.unshift({ ts: Date.now(), level: text });
  if (logs.length > 50) logs.pop();
  saveState();
  renderHistory();
  updateLevel(lvl);
  document.getElementById('recordSection')
          .scrollIntoView({ behavior:'smooth' });
};

// Initial render
renderSchedules();
renderHistory();
