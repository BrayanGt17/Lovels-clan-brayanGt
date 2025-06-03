import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";
// Variables locales
let miembros = [];
let escuadras = [];

async function inicializarEscuadras() {
  escuadras = [];

  for (let i = 1; i <= 14; i++) {
    const nombreEscuadra = `Escuadra ${i}`;
    const ref = doc(db, 'escuadras', nombreEscuadra);
    const snapshot = await getDoc(ref);

    // Si no existe en Firestore, lo creamos con fecha mínima
    if (!snapshot.exists()) {
      await setDoc(ref, {
        nombre: nombreEscuadra,
        ultimaModificacion: Timestamp.fromDate(new Date(0)) // 1970-01-01
      });
    }

    escuadras.push({ nombre: nombreEscuadra, lider: null });
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
async function cambiarNombreEscuadra(nombreMiembro, nombreAntiguo, nuevoNombre) {
  const escuadra = escuadras.find(e => e.nombre === nombreAntiguo);

  if (!escuadra) {
    alert('Escuadra no encontrada');
    return;
  }

  const miembro = miembros.find(m => m.nombre === nombreMiembro && m.escuadra === nombreAntiguo);
  if (!miembro) {
    alert('No perteneces a esta escuadra');
    return;
  }

  // Verificamos en Firebase si se cambió el nombre en los últimos 7 días
  try {
    const escRef = collection(db, 'escuadras');
    const escQuery = query(escRef, where('nombre', '==', nombreAntiguo));
    const escSnapshot = await getDocs(escQuery);

    if (escSnapshot.empty) {
      alert('Escuadra no encontrada en Firebase');
      return;
    }

    const escDoc = escSnapshot.docs[0];
    const escData = escDoc.data();

    const ahora = new Date();
    if (escData.ultimaModificacion?.toDate) {
      const ultimaFecha = escData.ultimaModificacion.toDate();
      const diferenciaDias = Math.floor((ahora - ultimaFecha) / (1000 * 60 * 60 * 24));

      if (diferenciaDias < 7) {
        alert(`⚠️ Solo puedes cambiar el nombre una vez por semana. Intenta en ${7 - diferenciaDias} día(s).`);
        return;
      }
    }

    // ✅ Actualizamos el nombre local
    escuadra.nombre = nuevoNombre;

    miembros.forEach(m => {
      if (m.escuadra === nombreAntiguo) {
        m.escuadra = nuevoNombre;
      }
    });

    // 🔁 Actualizar escuadra en Firestore
    await updateDoc(escDoc.ref, {
      nombre: nuevoNombre,
      ultimaModificacion: Timestamp.fromDate(ahora)
    });

    // 🔁 Actualizar miembros en Firebase
    const miembrosRef = collection(db, 'miembros');
    const miembrosQuery = query(miembrosRef, where('escuadra', '==', nombreAntiguo));
    const miembrosSnapshot = await getDocs(miembrosQuery);

    for (const doc of miembrosSnapshot.docs) {
      await updateDoc(doc.ref, { escuadra: nuevoNombre });
    }

    actualizarSelectEscuadras();
    actualizarListaMiembros();
    actualizarEstructuraEscuadras();

    alert(`✅ Nombre de escuadra cambiado a: ${nuevoNombre}`);
  } catch (error) {
    console.error('❌ Error al cambiar el nombre de la escuadra:', error);
    alert('Hubo un error al actualizar el nombre en Firebase');
  }
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
       <div class="escuadra-title" style="cursor: pointer; color: #007bff;" onclick="handleEscuadraClick('${escuadra.nombre}')">
  <i class="fas fa-users"></i> ${escuadra.nombre}
</div>

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
  let esLider = document.getElementById('esLider').checked;

  if (!nombre || !idff || !telefono || !escuadra) {
    alert("Completa todos los campos.");
    return;
  }

  if (miembros.some(m => m.idff === idff)) {
    alert("Este ID ya está registrado.");
    return;
  }

  // Validar teléfono internacional
  const telefonoRegex = /^\+\d{8,15}$/;
  if (!telefonoRegex.test(telefono)) {
    alert('Número inválido.usa Codigo de pais Ej: +521234567890');
    return;
  }

  const escActual = escuadras.find(e => e.nombre === escuadra);
  const miembrosEnEscuadra = miembros.filter(m => m.escuadra === escuadra);

  if (miembrosEnEscuadra.length >= 4) {
    alert(`La ${escuadra} ya tiene 4 miembros.`);
    return;
  }

  // Reemplazo de líder manual
  if (esLider && escActual.lider) {
    const reemplazar = confirm(`La ${escuadra} ya tiene líder: ${escActual.lider}. ¿Reemplazarlo?`);
    if (!reemplazar) return;

    const anterior = miembros.find(m => m.escuadra === escuadra && m.nombre === escActual.lider);
    if (anterior) anterior.esLider = false;
  }

  // Si NO se marcó como líder, verificar si debe ser líder automáticamente
if (!esLider && !escActual.lider) {
  const futurosMiembros = [...miembrosEnEscuadra, { nombre, escuadra }]; // simulamos agregar
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
    actualizarEstructuraEscuadras();
  } catch (err) {
    console.error("❌ Error:", err);
    alert("Error al registrar miembro");
  }
});
window.handleEscuadraClick = async function(nombreActual) {
  const nuevoNombre = prompt(`Nuevo nombre para ${nombreActual}:`);
  if (!nuevoNombre || nuevoNombre.trim() === nombreActual) return;

  const miembro = miembros.find(m => m.escuadra === nombreActual && m.nombre); // miembro actual
  if (!miembro) {
    alert('No se encontró un miembro válido para autorizar el cambio');
    return;
  }

  await cambiarNombreEscuadra(miembro.nombre, nombreActual, nuevoNombre.trim());
};


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
// Solo permitir "+" y números en teléfono
document.getElementById('telefono').addEventListener('input', function () {
  this.value = this.value.replace(/[^\d+]/g, '');
});

// Solo números en ID
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
  await inicializarEscuadras();

  actualizarSelectEscuadras();
  await cargarMiembros();
});
