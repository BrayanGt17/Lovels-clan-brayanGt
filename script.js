import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, query, orderBy, doc, updateDoc, where, writeBatch
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

// Configuración
const MAX_MEMBERS_PER_SQUAD = 4;
const form = document.getElementById('registroForm');
const lista = document.getElementById('listaMiembros');

// Registrar nuevo miembro
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const idff = document.getElementById('idff').value.trim();
  const telefono = document.getElementById('telefono').value.trim().replace(/\D/g, '');
  const escuadra = document.getElementById('escuadra').value;

  // Validación básica
  if (!nombre || !idff || !telefono || !escuadra) {
    showAlert('Completa todos los campos', 'error');
    return;
  }

  try {
    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

    // Verificar si la escuadra aún tiene espacio
    const squadQuery = query(collection(db, "miembros"), where("escuadra", "==", escuadra));
    const squadSnapshot = await getDocs(squadQuery);
    
    if (squadSnapshot.size >= MAX_MEMBERS_PER_SQUAD) {
      showAlert('Esta escuadra ya está llena. Por favor elige otra.', 'error');
      loadSquadsForRegistration(); // Recargar las opciones
      return;
    }

    // Registrar nuevo miembro
    await addDoc(collection(db, 'miembros'), {
      nombre,
      idff,
      telefono,
      escuadra,
      esLider: false,
      timestamp: new Date()
    });

    showAlert('✅ ¡Registro exitoso!', 'success');
    form.reset();
    await mostrarMiembros();
    await loadSquadsForRegistration(); // Actualizar lista de escuadras
    updateMemberCount(); // Actualizar contador
  } catch (error) {
    console.error("Error al registrar:", error);
    showAlert(`❌ Error: ${error.message}`, 'error');
  } finally {
    const btn = document.getElementById('register-btn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Registrar Miembro';
  }
});

// Mostrar miembros
async function mostrarMiembros() {
  try {
    lista.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando miembros...</div>';
    
    const miembrosSnap = await getDocs(query(collection(db, "miembros"), orderBy("escuadra")));
    const escuadras = {};
    let totalMembers = 0;

    miembrosSnap.forEach(doc => {
      const data = doc.data();
      if (!escuadras[data.escuadra]) escuadras[data.escuadra] = [];
      escuadras[data.escuadra].push({...data, id: doc.id});
      totalMembers++;
    });

    // Actualizar contador
    document.getElementById('total-members').textContent = totalMembers;

    let html = '';
    Object.keys(escuadras).sort().forEach(escuadra => {
      const lider = escuadras[escuadra].find(m => m.esLider);
      const membersCount = escuadras[escuadra].length;
      const isFull = membersCount >= MAX_MEMBERS_PER_SQUAD;
      
      html += `
        <div class="escuadra-group ${isFull ? 'squad-full' : ''}">
          <div class="escuadra-header">
            <div class="escuadra-title">
              ${escuadra}
              <span class="squad-count">${membersCount}/${MAX_MEMBERS_PER_SQUAD}</span>
            </div>
            ${lider ? `
              <div class="escuadra-leader">
                <i class="fas fa-crown"></i> Líder: ${lider.nombre}
              </div>
            ` : ''}
          </div>
          <ul class="miembros-list">
            ${escuadras[escuadra].sort((a, b) => b.esLider - a.esLider).map(m => `
              <li class="miembro-item ${m.esLider ? 'lider' : ''}">
                <div class="miembro-nombre">
                  ${m.nombre} 
                  ${m.esLider ? '<span class="lider-badge">LÍDER</span>' : ''}
                </div>
                <div class="miembro-detail">
                  <i class="fas fa-id-card"></i> ID: ${m.idff}
                </div>
                <div class="miembro-detail">
                  <i class="fas fa-phone"></i> 📞 ${formatearTelefono(m.telefono)}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    });

    lista.innerHTML = html || '<div class="empty">No hay miembros registrados aún.</div>';
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

// Cargar escuadras con espacio para registro
async function loadSquadsForRegistration() {
  try {
    const escuadraSelect = document.getElementById('escuadra');
    escuadraSelect.innerHTML = '<option value="">Cargando escuadras...</option>';
    
    // Obtener todas las escuadras y contar miembros
    const squadQuery = query(collection(db, "miembros"));
    const snapshot = await getDocs(squadQuery);
    
    const squadCounts = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      squadCounts[data.escuadra] = (squadCounts[data.escuadra] || 0) + 1;
    });
    
    // Opciones de escuadra (14 escuadras posibles)
    const allSquads = Array.from({length: 14}, (_, i) => `Escuadra ${i+1}`);
    
    // Filtrar escuadras con espacio
    const availableSquads = allSquads.filter(squad => {
      return (squadCounts[squad] || 0) < MAX_MEMBERS_PER_SQUAD;
    });
    
    // Actualizar select
    escuadraSelect.innerHTML = availableSquads.length 
      ? '<option value="">Selecciona una escuadra</option>'
      : '<option value="">No hay escuadras disponibles</option>';
    
    availableSquads.forEach(squad => {
      const count = squadCounts[squad] || 0;
      const option = document.createElement('option');
      option.value = squad;
      option.textContent = `${squad} (${count}/${MAX_MEMBERS_PER_SQUAD} miembros)`;
      escuadraSelect.appendChild(option);
    });
    
    // Mostrar información
    const squadInfo = document.getElementById('squad-info');
    if (availableSquads.length === 0) {
      squadInfo.innerHTML = '<div class="info-warning">Todas las escuadras están llenas. Contacta a un decano.</div>';
    } else {
      squadInfo.innerHTML = `<div class="info-success">Elige una escuadra con espacio disponible (máximo ${MAX_MEMBERS_PER_SQUAD} miembros por escuadra)</div>`;
    }
  } catch (error) {
    console.error("Error al cargar escuadras:", error);
    document.getElementById('escuadra').innerHTML = '<option value="">Error al cargar escuadras</option>';
  }
}

// Panel de administración para decanos
async function loadAdminData() {
  await loadMembersForAssignment();
  await loadSquadsForAdmin();
}

// Cargar miembros para asignación de líderes
async function loadMembersForAssignment() {
  try {
    const querySnapshot = await getDocs(collection(db, "miembros"));
    const selectMember = document.getElementById('select-member');
    selectMember.innerHTML = '<option value="">Seleccionar miembro</option>';
    
    querySnapshot.forEach((doc) => {
      const member = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = `${member.nombre} (${member.idff}) - ${member.escuadra || 'Sin escuadra'}`;
      selectMember.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar miembros para asignación:", error);
  }
}

// Cargar escuadras para panel de admin
async function loadSquadsForAdmin() {
  try {
    const selectSquad = document.getElementById('select-squad');
    selectSquad.innerHTML = '<option value="">Seleccionar escuadra</option>';
    
    // Agregar las 14 escuadras posibles
    for (let i = 1; i <= 14; i++) {
      const option = document.createElement('option');
      option.value = `Escuadra ${i}`;
      option.textContent = `Escuadra ${i}`;
      selectSquad.appendChild(option);
    }
  } catch (error) {
    console.error("Error al cargar escuadras para admin:", error);
  }
}

// Asignar líder (solo decanos)
async function assignLeader() {
  const squad = document.getElementById('select-squad').value;
  const memberId = document.getElementById('select-member').value;
  
  if (!squad || !memberId) {
    showAlert('Selecciona una escuadra y un miembro', 'error');
    return;
  }
  
  try {
    // Quitar el liderazgo anterior si existe
    const querySnapshot = await getDocs(
      query(collection(db, "miembros"), 
      where("escuadra", "==", squad),
      where("esLider", "==", true))
    );
    
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, { esLider: false });
    });
    
    // Asignar nuevo líder
    batch.update(doc(db, "miembros", memberId), {
      esLider: true,
      escuadra: squad
    });
    
    await batch.commit();
    showAlert('✅ Líder asignado correctamente', 'success');
    await mostrarMiembros();
    await loadSquadsForRegistration();
  } catch (error) {
    console.error("Error al asignar líder:", error);
    showAlert(`❌ Error: ${error.message}`, 'error');
  }
}

// Actualizar contador de miembros
async function updateMemberCount() {
  const querySnapshot = await getDocs(collection(db, "miembros"));
  document.getElementById('total-members').textContent = querySnapshot.size;
}

// Mostrar alertas
function showAlert(message, type = 'success') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <p>${message}</p>
    <button onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Eliminar alertas anteriores
  document.querySelectorAll('.alert').forEach(el => el.remove());
  
  document.body.appendChild(alert);
  
  // Auto-eliminación después de 5 segundos
  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 500);
  }, 5000);
}

function formatearTelefono(numero) {
  if (!numero) return 'N/A';
  const soloNumeros = numero.toString().replace(/\D/g, '');
  return soloNumeros.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  mostrarMiembros();
  loadSquadsForRegistration();
});

// Hacer funciones accesibles globalmente
window.mostrarMiembros = mostrarMiembros;
window.assignLeader = assignLeader;
window.loadAdminData = loadAdminData;
window.loadSquadsForRegistration = loadSquadsForRegistration;