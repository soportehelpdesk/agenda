// Registrar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
}

// ESTADO Y PERSISTENCIA (localStorage)
let store = {
  examenes: JSON.parse(localStorage.getItem('my_examenes')) || [],
  tareas: JSON.parse(localStorage.getItem('my_tareas')) || [],
  horario: JSON.parse(localStorage.getItem('my_horario')) || []
};

function saveStore() {
  localStorage.setItem('my_examenes', JSON.stringify(store.examenes));
  localStorage.setItem('my_tareas', JSON.stringify(store.tareas));
  localStorage.setItem('my_horario', JSON.stringify(store.horario));
}

// CAMBIO DE PESTAÑAS
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const tabTitle = document.getElementById('tab-title');

const titlesMap = {
  examenes: 'Exámenes',
  tareas: 'Tareas',
  horario: 'Horario Semanal'
};

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab');

    tabBtns.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(`sec-${tabName}`).classList.add('active');
    tabTitle.textContent = titlesMap[tabName];
  });
});

// 1. GESTIÓN DE EXÁMENES
const formExamen = document.getElementById('form-examen');
const listExamenes = document.getElementById('list-examenes');

formExamen.addEventListener('submit', (e) => {
  e.preventDefault();
  store.examenes.push({
    id: Date.now(),
    title: document.getElementById('ex-title').value,
    date: document.getElementById('ex-date').value,
    notes: document.getElementById('ex-notes').value
  });
  saveStore();
  renderExamenes();
  formExamen.reset();
});

function renderExamenes() {
  listExamenes.innerHTML = '';
  store.examenes.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (store.examenes.length === 0) {
    listExamenes.innerHTML = '<li style="color:#8e8e93; text-align:center;">Sin exámenes programados</li>';
    return;
  }

  store.examenes.forEach(ex => {
    const li = document.createElement('li');
    li.className = 'event-item';
    const fDate = new Date(ex.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

    li.innerHTML = `
      <div>
        <strong>${ex.title}</strong><br>
        <small style="color: #8e8e93;">${fDate} ${ex.notes ? '• ' + ex.notes : ''}</small>
      </div>
      <button class="delete-btn" onclick="deleteItem('examenes', ${ex.id})">✕</button>
    `;
    listExamenes.appendChild(li);
  });
}

// 2. GESTIÓN DE TAREAS Y FILTRADO
const formTarea = document.getElementById('form-tarea');
const listTareas = document.getElementById('list-tareas');
let currentTaskFilter = 'todas';

formTarea.addEventListener('submit', (e) => {
  e.preventDefault();
  store.tareas.push({
    id: Date.now(),
    title: document.getElementById('task-title').value,
    category: document.getElementById('task-category').value,
    date: document.getElementById('task-date').value,
    completed: false
  });
  saveStore();
  renderTareas();
  formTarea.reset();
});

document.querySelectorAll('.segment').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.segment').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTaskFilter = btn.getAttribute('data-filter');
    renderTareas();
  });
});

function renderTareas() {
  listTareas.innerHTML = '';
  let filtered = store.tareas;

  if (currentTaskFilter !== 'todas') {
    filtered = store.tareas.filter(t => t.category === currentTaskFilter);
  }

  filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (filtered.length === 0) {
    listTareas.innerHTML = '<li style="color:#8e8e93; text-align:center;">No hay tareas en esta categoría</li>';
    return;
  }

  filtered.forEach(t => {
    const li = document.createElement('li');
    li.className = 'event-item';
    const fDate = new Date(t.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

    li.innerHTML = `
      <div>
        <strong>${t.title}</strong><br>
        <small style="color: #8e8e93;">Hasta: ${fDate}</small>
      </div>
      <div>
        <span class="badge badge-${t.category}">${t.category}</span>
        <button class="delete-btn" onclick="deleteItem('tareas', ${t.id})">✕</button>
      </div>
    `;
    listTareas.appendChild(li);
  });
}

// 3. GESTIÓN DEL HORARIO SEMANAL
const formHorario = document.getElementById('form-horario');
const scheduleContainer = document.getElementById('schedule-container');

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

formHorario.addEventListener('submit', (e) => {
  e.preventDefault();
  store.horario.push({
    id: Date.now(),
    day: document.getElementById('schedule-day').value,
    time: document.getElementById('schedule-time').value,
    title: document.getElementById('schedule-title').value
  });
  saveStore();
  renderHorario();
  formHorario.reset();
});

function renderHorario() {
  scheduleContainer.innerHTML = '';

  // Días laborables en orden + fin de semana al final
  const orderedDays = ['1', '2', '3', '4', '5', '6', '0'];

  orderedDays.forEach(dIndex => {
    const items = store.horario
      .filter(h => h.day === dIndex)
      .sort((a, b) => a.time.localeCompare(b.time));

    if (items.length > 0) {
      const card = document.createElement('div');
      card.className = 'card';
      
      let html = `<h2>${dayNames[parseInt(dIndex)]}</h2><ul class="event-list">`;
      items.forEach(h => {
        html += `
          <li class="event-item">
            <div>
              <strong>${h.time}</strong> — ${h.title}
            </div>
            <button class="delete-btn" onclick="deleteItem('horario', ${h.id})">✕</button>
          </li>
        `;
      });
      html += '</ul>';
      card.innerHTML = html;
      scheduleContainer.appendChild(card);
    }
  });

  if (store.horario.length === 0) {
    scheduleContainer.innerHTML = '<div class="card" style="color:#8e8e93; text-align:center;">Añade clases o rutinas a tu horario</div>';
  }
}

// FUNCIÓN AUXILIAR DE BORRADO
window.deleteItem = function(type, id) {
  store[type] = store[type].filter(item => item.id !== id);
  saveStore();
  if (type === 'examenes') renderExamenes();
  if (type === 'tareas') renderTareas();
  if (type === 'horario') renderHorario();
};

// RENDER INICIAL
renderExamenes();
renderTareas();
renderHorario();
