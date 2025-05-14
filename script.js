// script.js
import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

// Elementos del DOM
const form = document.getElementById('registroForm');
const lista = document.getElementById('listaMiembros');
const loadingIndicator = document.createElement('div');
loadingIndicator.className = 'loading';
loadingIndicator.innerHTML = '<div class="spinner"></div><p>Cargando miembros...</p>';

// Configuración inicial
let miembrosData = [];

// Evento de envío del formulario
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const idff = document.getElementById('idff').value.trim();
  const telefono = document.getElementById('telefono').value.trim().replace(/\D/g, '');
  const escuadra = document.getElementById('escuadra').value;

  // Validación mejorada
  if (!nombre || !idff || !telefono || !escuadra) {
    showAlert('Por favor completa todos los campos', 'error');
    return;
  }

  if (!/^\d{10,15}$/.test(telefono)) {
    showAlert('El teléfono debe contener entre 10 y 15 dígitos', 'error');
    return;
  }

  if (!confirm('¿Estás seguro de registrar este miembro?')) {
    return;
  }

  try {
    // Mostrar carga durante la operación
    form.classList.add('submitting');
    
    const memberData = {
      nombre,
      idff,
      telefono,
      escuadra,
      timestamp: new Date()
    };

    if (form.dataset.editingId) {
      await updateDoc(doc(db, 'miembros', form.dataset.editingId), memberData);
      showAlert('¡Miembro actualizado con éxito!', 'success');
      form.dataset.editingId = '';
      form.querySelector('button[type="submit"]').textContent = 'Registrar Miembro';
    } else {
      await addDoc(collection(db, 'miembros'), memberData);
      showAlert('¡Miembro registrado con éxito!', 'success');
    }

    form.reset();
    await mostrarMiembros();
  } catch (error) {
    console.error("Error al registrar:", error);
    showAlert(`Error: ${error.message}`, 'error');
  } finally {
    form.classList.remove('submitting');
  }
});

// Mostrar miembros con mejoras
async function mostrarMiembros() {
  try {
    lista.innerHTML = '';
    lista.appendChild(loadingIndicator);
    
    const q = query(collection(db, "miembros"), orderBy("escuadra"), orderBy("nombre"));
    const miembrosSnap = await getDocs(q);
    miembrosData = miembrosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    if (miembrosData.length === 0) {
      lista.innerHTML = '<div class="empty">No hay miembros registrados aún.</div>';
      return;
    }
    
    const escuadras = groupByEscuadra(miembrosData);
    renderMiembrosList(escuadras);
    
  } catch (error) {
    console.error("Error al cargar miembros:", error);
    lista.innerHTML = `<div class="error">Error al cargar miembros: ${error.message}</div>`;
  }
}

// Agrupar por escuadra
function groupByEscuadra(miembros) {
  return miembros.reduce((acc, miembro) => {
    if (!acc[miembro.escuadra]) {
      acc[miembro.escuadra] = [];
    }
    acc[miembro.escuadra].push(miembro);
    return acc;
  }, {});
}

// Renderizar lista de miembros
function renderMiembrosList(escuadras) {
  let html = '';
  
  // Ordenar escuadras numéricamente
  const escuadrasOrdenadas = Object.keys(escuadras).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, ''));
    const numB = parseInt(b.replace(/\D/g, ''));
    return numA - numB;
  });

  escuadrasOrdenadas.forEach(nombreEscuadra => {
    html += `
      <div class="escuadra-container">
        <h3 class="escuadra-title">${nombreEscuadra}</h3>
        <ul class="miembros-list">
          ${escuadras[nombreEscuadra].map(m => `
            <li class="miembro-item" data-id="${m.id}">
              <div class="miembro-info">
                <strong>${m.nombre}</strong>
                <div class="miembro-details">
                  <span>ID: ${m.idff}</span>
                  <span>📞 ${formatTelefono(m.telefono)}</span>
                </div>
              </div>
              <div class="miembro-actions">
                <button class="btn-edit" data-id="${m.id}" title="Editar">✏️</button>
                <button class="btn-delete" data-id="${m.id}" title="Eliminar">🗑️</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  });

  lista.innerHTML = html;
  
  // Agregar event listeners para acciones
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => handleEdit(e.currentTarget.dataset.id));
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => handleDelete(e.currentTarget.dataset.id));
  });
}

// Formatear teléfono
function formatTelefono(num) {
  const cleaned = num.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : num;
}

// Mostrar alertas estilizadas
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 500);
  }, 3000);
}

// Manejar edición
async function handleEdit(miembroId) {
  const miembro = miembrosData.find(m => m.id === miembroId);
  if (!miembro) return;
  
  // Llenar formulario con datos existentes
  document.getElementById('nombre').value = miembro.nombre;
  document.getElementById('idff').value = miembro.idff;
  document.getElementById('telefono').value = miembro.telefono;
  document.getElementById('escuadra').value = miembro.escuadra;
  
  // Cambiar comportamiento del formulario para actualizar
  form.dataset.editingId = miembroId;
  form.querySelector('button[type="submit"]').textContent = 'Actualizar Miembro';
  
  // Scroll al formulario
  form.scrollIntoView({ behavior: 'smooth' });
}

// Manejar eliminación
async function handleDelete(miembroId) {
  if (!confirm('¿Estás seguro de eliminar este miembro permanentemente?')) return;
  
  try {
    await deleteDoc(doc(db, 'miembros', miembroId));
    showAlert('Miembro eliminado correctamente', 'success');
    await mostrarMiembros();
  } catch (error) {
    console.error("Error al eliminar:", error);
    showAlert(`Error al eliminar: ${error.message}`, 'error');
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  mostrarMiembros();
  
  // Mejorar entrada de teléfono
  const telefonoInput = document.getElementById('telefono');
  telefonoInput.addEventListener('input', function(e) {
    const value = e.target.value.replace(/\D/g, '');
    e.target.value = formatTelefono(value);
  });
});