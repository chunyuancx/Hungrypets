// UI elements
const planBtn         = document.getElementById('planBtn');
const recordBtn       = document.getElementById('recordBtn');
const dispenseBtn     = document.getElementById('dispenseBtn');
const planSection     = document.getElementById('planSection');
const recordSection   = document.getElementById('recordSection');
const planForm        = document.getElementById('planForm');
const planSaveBtn     = document.getElementById('planSaveBtn');
const scheduleList    = document.getElementById('scheduleList');
const historyTable    = document.getElementById('historyTable');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const alertBanner     = document.getElementById('alertBanner');
const levelBanner     = document.getElementById('levelBanner');
const currentLevel    = document.getElementById('currentLevel');

// Helpers
function formatAMPM(timeStr) {
  let [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2,'0')} ${ampm}`;
}
function compareTime(a, b) {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return ah*60 + am - (bh*60 + bm);
}

// State
let schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
let logs      = JSON.parse(localStorage.getItem('logs')      || '[]');
let editIndex = null;

// Persist
function saveState() {
  localStorage.setItem('schedules', JSON.stringify(schedules));
  localStorage.setItem('logs',      JSON.stringify(logs));
}

// Render schedule list
function renderSchedules() {
  schedules.sort(compareTime);
  scheduleList.innerHTML = schedules.length
    ? schedules.map((time,i)=>`
      <li class="list-group-item d-flex justify-content-between align-items-center p-1">
        ${formatAMPM(time)}
        <span>
          <button class="btn btn-link btn-sm edit-btn" data-index="${i}">Edit</button>
          <button class="btn btn-link btn-sm text-danger delete-btn" data-index="${i}">Delete</button>
        </span>
      </li>`).join('')
    : '<li class="list-group-item p-1">No schedules</li>';

  document.querySelectorAll('.edit-btn').forEach(btn=>{
    btn.onclick = () => {
      editIndex = +btn.dataset.index;
      document.getElementById('timeInput').value = schedules[editIndex];
      planSaveBtn.textContent = 'Update';
      planBtn.click();
    };
  });
  document.querySelectorAll('.delete-btn').forEach(btn=>{
    btn.onclick = () => {
      schedules.splice(+btn.dataset.index,1);
      saveState();
      renderSchedules();
    };
  });
}

// Render feed history
function renderHistory() {
  historyTable.innerHTML = logs.length
    ? logs.map(r=>`
      <tr>
        <td>${new Date(r.ts).toLocaleTimeString()}</td>
        <td>${r.level}</td>
      </tr>`).join('')
    : '<tr><td colspan="2">No records</td></tr>';
}

// Clear history
clearHistoryBtn.onclick = ()=>{
  logs = [];
  saveState();
  renderHistory();
};

// Fetch real level
async function fetchLevel() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error(res.statusText);
    const { food_level } = await res.json();
    return food_level;
  } catch {
    return null;
  }
}

// Update banners
function updateLevelBanner(level) {
  const isLow = level !== null && level <= 20;
  currentLevel.textContent = level===null
    ? '—'
    : (isLow ? 'Low' : 'Filled');
  levelBanner.classList.toggle('alert-danger', isLow);
  levelBanner.classList.toggle('alert-info', !isLow);
}
function updateAlert(level) {
  alertBanner.style.display = (level!==null && level<=20) ? 'block' : 'none';
}

// Poll level every 10s
setInterval(async()=>{
  const lvl = await fetchLevel();
  updateLevelBanner(lvl);
  updateAlert(lvl);
},10000);
(async()=>{
  const lvl = await fetchLevel();
  updateLevelBanner(lvl);
  updateAlert(lvl);
})();

// Tab navigation
function activate(btn) {
  [planBtn,recordBtn].forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
planBtn.onclick = ()=>{
  activate(planBtn);
  planSection.style.display='block';
  recordSection.style.display='none';
};
recordBtn.onclick = ()=>{
  activate(recordBtn);
  planSection.style.display='none';
  recordSection.style.display='block';
  renderHistory();
};
planBtn.click();
renderSchedules();

// Handle Add/Update schedule
planForm.onsubmit = e=>{
  e.preventDefault();
  const time = document.getElementById('timeInput').value;
  if (editIndex===null) schedules.push(time);
  else schedules[editIndex]=time;
  saveState();
  renderSchedules();
  planForm.reset();
  planSaveBtn.textContent='Save';
  editIndex=null;
};

// Manual dispense: always log time & level (or Failed)
dispenseBtn.onclick = async ()=>{
  const now = Date.now();
  let level;
  try {
    const r = await fetch('/api/dispense',{method:'POST'});
    if (!r.ok) throw new Error(r.statusText);
    const lvl = await fetchLevel();
    level = lvl===null ? 'Failed' : (lvl<=20 ? 'Low':'Filled');
  } catch {
    level = 'Failed';
  }
  logs.unshift({ts:now, level});
  if (logs.length>50) logs.pop();
  saveState();

  updateLevelBanner(level==='Failed'?null:(level==='Low'?0:100));
  updateAlert(level==='Low'?0:100);

  // switch to record and show it
  recordBtn.click();
  renderHistory();
};
