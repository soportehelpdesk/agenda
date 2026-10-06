import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
}

// 1. CONFIGURACIÓN DE FIREBASE (Tus credenciales exactas)
const firebaseConfig = {
  apiKey: "AIzaSyBjS8FOjaOlaHPyiV9ckv1zqpBk8Ll9a54",
  authDomain: "agenda-1ec29.firebaseapp.com",
  projectId: "agenda-1ec29",
  storageBucket: "agenda-1ec29.firebasestorage.app",
  messagingSenderId: "583448056686",
  appId: "1:583448056686:web:40e3eb77f9bc2b80e0677f",
  measurementId: "G-VQ4DGVC9JP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Estado de la app
let userId = null;
let syncStatusEl = document.getElementById('sync-status');
let store = {
  examenes: [],
  tareas: [],
  horario: []
};

// Autenticación anónima e inicio de sincronización
signInAnonymously(auth).catch(error => {
  console.error("Error en la autenticación anónima:", error);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    userId = user.uid;
    syncStatusEl.textContent = "Sincronizado";
    syncStatusEl.className = "sync-status online";
    
    // Escuchar cambios en Firestore en TIEMPO REAL
    const userDocRef = doc(db, "agendas", userId);
    onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        store = docSnap.data();
        renderExamenes();
        renderTareas();
        renderHorario();
        renderCalendar();
      } else {
        saveStoreRemote();
      }
    }, (error) => {
      console.error("Error al sincronizar con Firestore:", error);
      syncStatusEl.textContent = "Error sync";
      syncStatusEl.className = "sync-status offline";
    });
  } else {
    syncStatusEl.textContent = "Desconectado";
    syncStatusEl.className = "sync-status offline";
  }
});

async function saveStoreRemote() {
  if (!userId) return;
  try {
    const userDocRef = doc(db, "agendas", userId);
    await setDoc(userDocRef, store);
  } catch (error) {
    console.error("Error guardando en Firestore:", error);
  }
}

// CAMBIO DE PESTAÑAS
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const tabTitle = document.getElementById('tab-title');

const titlesMap = {
  examenes: 'Exámenes',
  tareas: 'Tareas',
  calendario: 'Calendario Mensual',
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

    if (tabName === 'calendario') {
      renderCalendar();
    }
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
  saveStoreRemote();
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
  saveStoreRemote();
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

// 3. CALENDARIO MENSUAL INTERACTIVO
let currentDate = new Date();
let selectedDateStr = new Date().toISOString().split('T')[0];

const calMonthYear = document.getElementById('cal-month-year');
const calDaysGrid = document.getElementById('calendar-days');
const calPrevBtn = document.getElementById('cal-prev');
const calNextBtn = document.getElementById('cal-next');
const selectedDateTitle = document.getElementById('selected-date-title');
const selectedDayList = document.getElementById('selected-day-list');

calPrevBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

calNextBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  calMonthYear.textContent = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  calDaysGrid.innerHTML = '';

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Ajustar Lunes = 0
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Días vacíos al inicio
  for (let i = 0; i < firstDayIndex; i++) {
    const div = document.createElement('div');
    div.className = 'cal-day empty';
    calDaysGrid.appendChild(div);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let day = 1; day <= totalDays; day++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'cal-day';
    dayDiv.textContent = day;

    const monthFormatted = String(month + 1).padStart(2, '0');
    const dayFormatted = String(day).padStart(2, '0');
    const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;

    if (dateStr === todayStr) dayDiv.classList.add('today');
    if (dateStr === selectedDateStr) dayDiv.classList.add('selected');

    // Comprobar eventos en este día
    const hasExams = store.examenes.some(e => e.date.startsWith(dateStr));
    const hasTasks = store.tareas.some(t => t.date === dateStr);

    if (hasExams || hasTasks) {
      const dotsDiv = document.createElement('div');
      dotsDiv.className = 'dots-container';
      if (hasExams) {
        const dot = document.createElement('div');
        dot.className = 'dot dot-examen';
        dotsDiv.appendChild(dot);
      }
      if (hasTasks) {
        const dot = document.createElement('div');
        dot.className = 'dot dot-tarea';
        dotsDiv.appendChild(dot);
      }
      dayDiv.appendChild(dotsDiv);
    }

    dayDiv.addEventListener('click', () => {
      selectedDateStr = dateStr;
      renderCalendar();
      renderSelectedDayEvents(dateStr);
    });

    calDaysGrid.appendChild(dayDiv);
  }

  renderSelectedDayEvents(selectedDateStr);
}

function renderSelectedDayEvents(dateStr) {
  selectedDayList.innerHTML = '';
  
  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  selectedDateTitle.textContent = `Eventos del ${formattedDate}`;

  const exams = store.examenes.filter(e => e.date.startsWith(dateStr));
  const tasks = store.tareas.filter(t => t.date === dateStr);

  if (exams.length === 0 && tasks.length === 0) {
    selectedDayList.innerHTML = '<li style="color:#8e8e93; text-align:center;">No hay tareas ni exámenes en este día</li>';
    return;
  }

  exams.forEach(ex => {
    const li = document.createElement('li');
    li.className = 'event-item';
    const time = ex.date.split('T')[1] || '';
    li.innerHTML = `
      <div>
        <strong>${ex.title}</strong><br>
        <small style="color: #8e8e93;">Examen ${time ? 'a las ' + time : ''}</small>
      </div>
      <span class="badge badge-examen">Examen</span>
    `;
    selectedDayList.appendChild(li);
  });

  tasks.forEach(t => {
    const li = document.createElement('li');
    li.className = 'event-item';
    li.innerHTML = `
      <div>
        <strong>${t.title}</strong>
      </div>
      <span class="badge badge-${t.category}">${t.category}</span>
    `;
    selectedDayList.appendChild(li);
  });
}

// 4. GESTIÓN DEL HORARIO SEMANAL
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
  saveStoreRemote();
  formHorario.reset();
});

function renderHorario() {
  scheduleContainer.innerHTML = '';

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
  saveStoreRemote();
};
