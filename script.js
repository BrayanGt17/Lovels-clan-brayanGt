import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, query, orderBy, where, updateDoc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

let miembros = [];
let escuadras = Array.from({ length: 14 }, (_, i) => ({ nombre: `Escuadra ${i + 1}`, lider: null }));

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

function actualizarListaMiembros() {
  const listaContainer = document.getElementById('listaMiembros');
  const contador = document.getElementById('contadorMiembros');
  const totalMiembros = document.getElementById('totalMiembros');

  contador.textContent = miembros.length;
  totalMiembros.textContent = miembros.length;

  listaContainer.innerHTML = miembros.length === 0
    ? '<div class="empty">No hay miembros registrados aún.</div>'
    : `<ul class="miembros-list">
        ${miembros.map(m => `
          <li class="miembro-item ${m.esLider ? 'lider' : ''}">
            <div class="miembro-nombre">${m.nombre} ${m.esLider ? '<span class="lider-badge">LÍDER</span>' : ''}</div>
            <div class="miembro-detail"><i class="fas fa-users"></i> Escuadra: ${m.escuadra}</div>
            <div class="miembro-detail"><i class="fas fa-id-card"></i> ID: ${m.idff}</div>
            <div class="miembro-detail"><i class="fas fa-phone"></i> 📞 ${m.telefono}</div>
          </li>`).join('')}
      </ul>`;
}

async function cargarMiembros() {
  miembros = [];
  const snapshot = await getDocs(collection(db, 'miembros'));
  snapshot.forEach(doc => {
    const data = doc.data();
    miembros.push(data);
    if (data.esLider) {
      const esc = escuadras.find(e => e.nombre === data.escuadra);
      if (esc) esc.lider = data.nombre;
    }
  });
  actualizarListaMiembros();
}

document.getElementById('registroForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const idff = document.getElementById('idff').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const escuadra = document.getElementById('escuadra').value;
  let esLider = document.getElementById('esLider').checked;

  if (!nombre || !idff || !telefono || !escuadra) {
    alert("Completa todos los campos.");
    return;
  }

  if (miembros.some(m => m.idff === idff)) {
    alert("Este ID ya está registrado.");
    return;
  }

  const telefonoRegex = /^\+\d{8,15}$/;
  if (!telefonoRegex.test(telefono)) {
    alert('Número inválido. Usa código de país Ej: +521234567890');
    return;
  }

  const escActual = escuadras.find(e => e.nombre === escuadra);
  const miembrosEnEscuadra = miembros.filter(m => m.escuadra === escuadra);

  if (miembrosEnEscuadra.length >= 4) {
    alert(`La ${escuadra} ya tiene 4 miembros.`);
    return;
  }

  if (esLider && escActual.lider) {
    const reemplazar = confirm(`La ${escuadra} ya tiene líder: ${escActual.lider}. ¿Reemplazarlo?`);
    if (!reemplazar) return;
    const anterior = miembros.find(m => m.escuadra === escuadra && m.nombre === escActual.lider);
    if (anterior) anterior.esLider = false;
  }

  if (!esLider && !escActual.lider) {
    const futurosMiembros = [...miembrosEnEscuadra, { nombre, escuadra }];
    if (futurosMiembros.length === 4) {
      esLider = true;
      escActual.lider = nombre;
      alert(`ℹ️ ${nombre} ha sido asignado como líder automáticamente.`);
    }
  }

  const nuevoMiembro = { nombre, idff, telefono, escuadra, esLider };

  try {
    await addDoc(collection(db, 'miembros'), nuevoMiembro);
    miembros.push(nuevoMiembro);
    if (esLider) escActual.lider = nombre;
    alert("✅ ¡Registrado!");
    e.target.reset();
    actualizarSelectEscuadras();
    actualizarListaMiembros();
  } catch (err) {
    console.error("❌ Error:", err);
    alert("Error al registrar miembro");
  }
});

window.copyToClipboard = function (text) {
  navigator.clipboard.writeText(text).then(() => {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-copied';
    tooltip.textContent = '¡ID copiado al portapapeles!';
    document.body.appendChild(tooltip);
    setTimeout(() => tooltip.remove(), 2000);
  });
};

document.getElementById('telefono').addEventListener('input', function () {
  this.value = this.value.replace(/[^\d+]/g, '');
});

document.getElementById('idff').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});

window.switchTab = function (tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById(`${tabId}-tab`).classList.add('active');
  event.currentTarget.classList.add('active');
  if (tabId === 'miembros') {
    actualizarListaMiembros();
  }
};

window.addEventListener('DOMContentLoaded', async () => {
  await cargarMiembros();
  actualizarSelectEscuadras();
});
