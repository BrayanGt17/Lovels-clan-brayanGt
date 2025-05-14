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
      // CORRECCIÓN: Paréntesis correctos en addDoc
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

// Función mejorada para mostrar miembros
async function mostrarMiembros() {
  try {
    lista.innerHTML = '';
    lista.appendChild(loadingIndicator);
    
    // Consulta con manejo de errores mejorado
    const q = query(collection(db, "miembros"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      lista.innerHTML = '<div class="empty">No hay miembros registrados aún.</div>';
      return;
    }
    
    miembrosData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    }));
    
    renderMiembrosList(miembrosData);
  } catch (error) {
    console.error("Error al cargar miembros:", error);
    lista.innerHTML = `
      <div class="error">
        <p>Error al cargar miembros: ${error.message}</p>
        <button onclick="mostrarMiembros()">Reintentar</button>
      </div>
    `;
  }
}

// Renderizar lista de miembros (versión simplificada)
function renderMiembrosList(miembros) {
  // Ordenar por escuadra primero
  miembros.sort((a, b) => a.escuadra.localeCompare(b.escuadra) || a.nombre.localeCompare(b.nombre));
  
  let currentEscuadra = '';
  let html = '';

  miembros.forEach(miembro => {
    // Mostrar encabezado de escuadra cuando cambia
    if (miembro.escuadra !== currentEscuadra) {
      currentEscuadra = miembro.escuadra;
      html += `<h3 class="escuadra-title">${currentEscuadra}</h3><ul class="miembros-list">`;
    }
    
    html += `
      <li class="miembro-item">
        <div class="miembro-info">
          <strong>${miembro.nombre}</strong>
          <div class="miembro-details">
            <span>ID: ${miembro.idff}</span>
            <span>📞 ${formatTelefono(miembro.telefono)}</span>
          </div>
        </div>
      </li>
    `;
  });

  // Cerrar el último ul si hay miembros
  if (miembros.length > 0) {
    html += '</ul>';
  }

  lista.innerHTML = html || '<div class="empty">No hay miembros registrados.</div>';
}

// Función mejorada para mostrar alertas
function showAlert(message, type) {
  // Eliminar alertas anteriores
  const existingAlerts = document.querySelectorAll('.alert');
  existingAlerts.forEach(alert => alert.remove());
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <p>${message}</p>
    <button onclick="this.parentElement.remove()">×</button>
  `;
  
  document.body.appendChild(alert);
  
  // Auto-eliminación después de 5 segundos
  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 500);
  }, 5000);
}

// Formatear teléfono
function formatTelefono(num) {
  if (!num) return 'N/A';
  const cleaned = num.toString().replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : cleaned;
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Configurar el campo de teléfono
  const telefonoInput = document.getElementById('telefono');
  telefonoInput.addEventListener('input', function(e) {
    const value = e.target.value.replace(/\D/g, '');
    e.target.value = formatTelefono(value);
  });

  // Mostrar miembros al cargar
  mostrarMiembros();
});