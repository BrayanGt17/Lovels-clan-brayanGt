import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

// Variables locales
let miembros = [];
let escuadras = [];

// Inicializar escuadras vacías
function inicializarEscuadras() {
  escuadras = [];
  for (let i = 1; i <= 14; i++) {
    escuadras.push({ nombre: `Escuadra ${i}`, lider: null });
  }
}

// Actualiza el select del formulario
function actualizarSelectEscuadras() {
  const select = document.getElementById('escuadra');
  select.innerHTML = '<option value="">Selecciona una escuadra</option>';

  escuadras.forEach(e => {
    const option = document.createElement('option');
    option.value = e.nombre;
    option.textContent = e.lider ? `${e.nombre} (Líder: ${e.lider})` : e.nombre;
    select.appendChild(option);
  });
}

// Mostrar lista de miembros por escuadra
function actualizarListaMiembros() {
  const listaContainer = document.getElementById('listaMiembros');
  const contador = document.getElementById('contadorMiembros');
  const totalMiembros = document.getElementById('totalMiembros');

  contador.textContent = miembros.length;
  totalMiembros.textContent = miembros.length;

  if (miembros.length === 0) {
    listaContainer.innerHTML = '<div class="empty">No hay miembros registrados aún.</div>';
    return;
  }

  listaContainer.innerHTML = '<ul class="miembros-list"></ul>';
  const ul = listaContainer.querySelector('ul');

  miembros.forEach(m => {
    const li = document.createElement('li');
    li.className = m.esLider ? 'miembro-item lider' : 'miembro-item';

    li.innerHTML = `
      <div class="miembro-nombre">${m.nombre} ${m.esLider ? '<span class="lider-badge">LÍDER</span>' : ''}</div>
      <div class="miembro-detail"><i class="fas fa-users"></i> Escuadra: ${m.escuadra}</div>
      <div class="miembro-detail"><i class="fas fa-id-card"></i> ID: ${m.idff}</div>
      <div class="miembro-detail"><i class="fas fa-phone"></i> 📞 ${m.telefono}</div>
    `;
    ul.appendChild(li);
  });
}
function cambiarNombreEscuadra(nombreLider, nombreAntiguo, nuevoNombre) {
  const escuadra = escuadras.find(e => e.nombre === nombreAntiguo);
  
  if (!escuadra) {
    alert('Escuadra no encontrada');
    return;
  }

  if (escuadra.lider !== nombreLider) {
    alert('Solo el líder puede cambiar el nombre de la escuadra');
    return;
  }

  // Cambiar nombre en estructura local
  escuadra.nombre = nuevoNombre;

  // Actualizar a todos los miembros de esa escuadra localmente
  miembros.forEach(m => {
    if (m.escuadra === nombreAntiguo) {
      m.escuadra = nuevoNombre;
    }
  });

  // Volver a renderizar vistas
  actualizarSelectEscuadras();
  actualizarListaMiembros();
  actualizarEstructuraEscuadras();

  alert(`Nombre cambiado a: ${nuevoNombre}`);
}

// Estructura de escuadras visual
function actualizarEstructuraEscuadras() {
  const container = document.getElementById('estructuraEscuadras');
  container.innerHTML = '';

  escuadras.forEach(escuadra => {
    const miembrosEscuadra = miembros.filter(m => m.escuadra === escuadra.nombre);
    const div = document.createElement('div');
    div.className = 'escuadra-group';

    div.innerHTML = `
      <div class="escuadra-header">
        <div class="escuadra-title"><i class="fas fa-users"></i> ${escuadra.nombre}</div>
        <div class="escuadra-leader">${escuadra.lider ? `<i class="fas fa-crown"></i> Líder: ${escuadra.lider}` : '<i class="fas fa-exclamation-circle"></i> Sin líder asignado'}</div>
      </div>
    `;

    const ul = document.createElement('ul');
    ul.className = 'miembros-list';

    if (miembrosEscuadra.length === 0) {
      const li = document.createElement('li');
      li.className = 'miembro-item';
      li.textContent = 'No hay miembros en esta escuadra.';
      ul.appendChild(li);
    } else {
      miembrosEscuadra.forEach(m => {
        const li = document.createElement('li');
        li.className = m.esLider ? 'miembro-item lider' : 'miembro-item';
        li.innerHTML = `
          <div class="miembro-nombre">${m.nombre} ${m.esLider ? '<span class="lider-badge">LÍDER</span>' : ''}</div>
          
        `;
        ul.appendChild(li);
      });
    }

    div.appendChild(ul);
    container.appendChild(div);
  });
}

// Cargar datos desde Firebase
async function cargarMiembros() {
  miembros = [];

  const snapshot = await getDocs(collection(db, 'miembros'));
  snapshot.forEach(doc => {
    const data = doc.data();
    miembros.push(data);

    // Si es líder, marcarlo en escuadras
    if (data.esLider) {
      const esc = escuadras.find(e => e.nombre === data.escuadra);
      if (esc) esc.lider = data.nombre;
    }
  });

  actualizarListaMiembros();
  actualizarEstructuraEscuadras();
}

// Registrar nuevo miembro
document.getElementById('registroForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const idff = document.getElementById('idff').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const escuadra = document.getElementById('escuadra').value;
  const esLider = document.getElementById('esLider').checked;

  if (!nombre || !idff || !telefono || !escuadra) {
    alert("Completa todos los campos.");
    return;
  }

  if (miembros.some(m => m.idff === idff)) {
    alert("Este ID ya está registrado.");
    return;
  }
// Validar teléfono: debe comenzar con '+' y contener solo números (mínimo 8 dígitos)
const telefonoRegex = /^\+\d{8,15}$/;
if (!telefonoRegex.test(telefono)) {
  alert('Por favor ingresa un número válido con código de país. Ej: +521234567890');
  return;
}

  // Verificar líder duplicado
  const escActual = escuadras.find(e => e.nombre === escuadra);
  if (esLider && escActual.lider) {
    if (!confirm(`La ${escuadra} ya tiene líder: ${escActual.lider}. ¿Reemplazarlo?`)) {
      return;
    }

    // Quitar liderazgo al anterior
    const anterior = miembros.find(m => m.escuadra === escuadra && m.nombre === escActual.lider);
    if (anterior) anterior.esLider = false;
  }
// Validar si ya hay 4 miembros en la escuadra
const miembrosEnEscuadra = miembros.filter(m => m.escuadra === escuadra);
if (miembrosEnEscuadra.length >= 4) {
  alert(`La ${escuadra} ya tiene 4 miembros. No se pueden agregar más.`);
  return;
}

  const nuevoMiembro = { nombre, idff, telefono, escuadra, esLider };

  try {
    await addDoc(collection(db, 'miembros'), nuevoMiembro);
    miembros.push(nuevoMiembro);
    if (esLider) {
      escActual.lider = nombre;
    }

    alert("✅ ¡Registrado!");
    e.target.reset();
    actualizarSelectEscuadras();
    actualizarListaMiembros();
    actualizarEstructuraEscuadras();
  } catch (err) {
    console.error("❌ Error:", err);
    alert("Error al registrar miembro");
  }
});

// Función para copiar ID
window.copyToClipboard = function (text) {
  navigator.clipboard.writeText(text).then(() => {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-copied';
    tooltip.textContent = '¡ID copiado al portapapeles!';
    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 2000);
  });
};
// Solo permitir + y números en tiempo real
document.getElementById('telefono').addEventListener('input', function () {
  this.value = this.value.replace(/[^\d+]/g, '');
});

// Validar que solo se escriban números en el ID
document.getElementById('idff').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});

// Cambiar pestañas
window.switchTab = function (tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));

  document.getElementById(`${tabId}-tab`).classList.add('active');
  event.currentTarget.classList.add('active');

  if (tabId === 'miembros') {
    actualizarListaMiembros();
  } else if (tabId === 'escuadras') {
    actualizarEstructuraEscuadras();
  }
};

// Al cargar página
window.addEventListener('DOMContentLoaded', async () => {
  inicializarEscuadras();
  actualizarSelectEscuadras();
  await cargarMiembros();
});
