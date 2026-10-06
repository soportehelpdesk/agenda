// Registrar el Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker registrado con éxito'))
    .catch(err => console.error('Error al registrar Service Worker:', err));
}

const form = document.getElementById('event-form');
const list = document.getElementById('event-list');

// Cargar eventos guardados
let events = JSON.parse(localStorage.getItem('my_events')) || [];

function renderEvents() {
  list.innerHTML = '';
  events.sort((a, b) => new Date(a.date) - new Date(b.date));

  events.forEach((ev, index) => {
    const li = document.createElement('li');
    li.className = 'event-item';
    
    const formattedDate = new Date(ev.date).toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    li.innerHTML = `
      <div>
        <strong>${ev.title}</strong><br>
        <small style="color: #666;">${formattedDate}</small>
      </div>
      <span class="badge badge-${ev.type}">${ev.type}</span>
    `;

    // Eliminar con un clic largo / tap
    li.addEventListener('dblclick', () => {
      events.splice(index, 1);
      saveEvents();
    });

    list.appendChild(li);
  });
}

function saveEvents() {
  localStorage.setItem('my_events', JSON.stringify(events));
  renderEvents();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const title = document.getElementById('title').value;
  const type = document.getElementById('type').value;
  const date = document.getElementById('date').value;

  events.push({ title, type, date });
  saveEvents();

  form.reset();
});

renderEvents();
