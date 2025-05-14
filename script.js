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

// Función para mostrar miembros con manejo de errores mejorado
async function mostrarMiembros() {
  try {
    lista.innerHTML = '';
    lista.appendChild(loadingIndicator);
    
    // Primero intenta con la consulta compuesta
    try {
      const q = query(
        collection(db, "miembros"), 
        orderBy("escuadra"), 
        orderBy("nombre")
      );
      await loadMembers(q);
    } catch (error) {
      if (error.code === 'failed-precondition') {
        console.warn("Índice compuesto no disponible, usando orden simple");
        // Fallback a orden simple si el índice no está listo
        const q = query(
          collection(db, "miembros"), 
          orderBy("escuadra")
        );
        await loadMembers(q);
        showAlert('Los datos se cargaron con ordenación básica. La ordenación completa estará disponible pronto.', 'info');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error al cargar miembros:", error);
    lista.innerHTML = `
      <div class="error">
        <p>Error al cargar miembros: ${error.message}</p>
        <p>Por favor recarga la página o intenta nuevamente más tarde.</p>
        <button onclick="window.location.reload()">Reintentar</button>
      </div>
    `;
  }
}

// Función auxiliar para cargar miembros
async function loadMembers(query) {
  const miembrosSnap = await getDocs(query);
  
  if (miembrosSnap.empty) {
    lista.innerHTML = '<div class="empty">No hay miembros registrados aún.</div>';
    return;
  }
  
  miembrosData = miembrosSnap.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date()
  }));
  
  const escuadras = groupByEscuadra(miembrosData);
  renderMiembrosList(escuadras);
}

// Resto del código permanece igual...
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
    // Ordenar miembros por nombre dentro de cada escuadra
    const miembrosOrdenados = escuadras[nombreEscuadra].sort((a, b) => 
      a.nombre.localeCompare(b.nombre));
    
    html += `
      <div class="escuadra-container">
        <h3 class="escuadra-title">${nombreEscuadra}</h3>
        <ul class="miembros-list">
          ${miembrosOrdenados.map(m => `
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
  if (!num) return '';
  const cleaned = num.toString().replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : cleaned;
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
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Actualizar Miembro';
  submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Miembro';
  
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
  // Configurar el campo de teléfono
  const telefonoInput = document.getElementById('telefono');
  telefonoInput.addEventListener('input', function(e) {
    const value = e.target.value.replace(/\D/g, '');
    e.target.value = formatTelefono(value);
  });

  // Cargar miembros iniciales
  mostrarMiembros();
});