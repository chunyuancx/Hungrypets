// UI elements
const planBtn      = document.getElementById('planBtn');
const recordBtn    = document.getElementById('recordBtn');
const dispenseBtn  = document.getElementById('dispenseBtn');
const planSection  = document.getElementById('planSection');
const recordSection= document.getElementById('recordSection');
const planForm     = document.getElementById('planForm');
const scheduleList = document.getElementById('scheduleList');
const historyTable = document.getElementById('historyTable');
const alertBanner  = document.getElementById('alertBanner');

// Load or init state
let schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
let logs      = JSON.parse(localStorage.getItem('logs')      || '[]');
let foodLevel = parseInt(localStorage.getItem('foodLevel')  || '100', 10);

// Helpers to persist
function saveState() {
  localStorage.setItem('schedules', JSON.stringify(schedules));
  localStorage.setItem('logs',      JSON.stringify(logs));
  localStorage.setItem('foodLevel', foodLevel);
}

// Render functions
function renderSchedules() {
  scheduleList.innerHTML = schedules
    .sort((a,b)=> a.time.localeCompare(b.time))
    .map(s=>
      `<li class="list-group-item d-flex justify-content-between align-items-center p-1">
        ${s.time} — ${s.portion}g
      </li>`
    ).join('') || '<li class="list-group-item p-1">No schedules</li>';
}

function renderHistory() {
  historyTable.innerHTML = logs.length
    ? logs.map(r=>
      `<tr>
         <td>${new Date(r.ts).toLocaleTimeString()}</td>
         <td>${r.portion}g</td>
         <td>${r.level}%</td>
       </tr>`
    ).join('')
    : '<tr><td colspan="3">No records</td></tr>';
}

function updateAlert() {
  alertBanner.style.display = foodLevel <= 20 ? 'block' : 'none';
}

// Tab navigation
function activate(btn) {
  [planBtn, recordBtn].forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

planBtn.onclick = () => {
  activate(planBtn);
  planSection.style.display   = 'block';
  recordSection.style.display = 'none';
};

recordBtn.onclick = () => {
  activate(recordBtn);
  planSection.style.display   = 'none';
  recordSection.style.display = 'block';
  renderHistory();
};

// Default to Meal Plan tab
planBtn.click();

// Handle new schedule
planForm.onsubmit = e => {
  e.preventDefault();
  const time    = document.getElementById('timeInput').value;
  const portion = parseInt(document.getElementById('portionInput').value, 10);
  schedules.push({ time, portion });
  saveState();
  renderSchedules();
  planForm.reset();
};

// Manual dispense
dispenseBtn.onclick = () => {
  const portion = 50;  // default manual portion size
  foodLevel = Math.max(0, foodLevel - portion);
  logs.unshift({ ts: Date.now(), portion, level: foodLevel });
  if (logs.length > 50) logs.pop();
  saveState();
  renderHistory();
  updateAlert();
};

// Initial render
renderSchedules();
updateAlert();
