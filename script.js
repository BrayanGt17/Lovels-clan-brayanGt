import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

// Elementos del DOM
const form = document.getElementById('registroForm');
const lista = document.getElementById('listaMiembros');

// Función para mostrar alertas
function showAlert(message, type = 'success') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 3000);
}

// Registrar nuevo miembro
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const idff = document.getElementById('idff').value.trim();
  const telefono = document.getElementById('telefono').value.trim().replace(/\D/g, '');
  const escuadra = document.getElementById('escuadra').value;

  if (!nombre || !idff || !telefono || !escuadra) {
    showAlert('Completa todos los campos', 'error');
    return;
  }

  try {
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Registrando...';

    await addDoc(collection(db, 'miembros'), {
      nombre,
      idff,
      telefono,
      escuadra,
      timestamp: new Date()
    });

    showAlert('✅ Miembro registrado correctamente');
    form.reset();
    await mostrarMiembros();
  } catch (error) {
    console.error("Error:", error);
    showAlert('❌ Error al registrar: ' + error.message, 'error');
  } finally {
    const button = form.querySelector('button');
    button.disabled = false;
    button.textContent = 'Registrar';
  }
});

// Mostrar miembros agrupados por escuadra
async function mostrarMiembros() {
  try {
    lista.innerHTML = '<p>Cargando miembros...</p>';
    
    const querySnapshot = await getDocs(collection(db, 'miembros'));
    const miembrosPorEscuadra = {};
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (!miembrosPorEscuadra[data.escuadra]) {
        miembrosPorEscuadra[data.escuadra] = [];
      }
      miembrosPorEscuadra[data.escuadra].push(data);
    });

    // Ordenar escuadras numéricamente
    const escuadrasOrdenadas = Object.keys(miembrosPorEscuadra).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''));
      const numB = parseInt(b.replace(/\D/g, ''));
      return numA - numB;
    });

    let html = '';
    escuadrasOrdenadas.forEach(escuadra => {
      html += `<div class="escuadra-group">`;
      html += `<h3 class="escuadra-title">${escuadra}</h3>`;
      html += `<ul class="miembros-list">`;
      
      // Ordenar miembros por nombre dentro de cada escuadra
      miembrosPorEscuadra[escuadra].sort((a, b) => a.nombre.localeCompare(b.nombre))
        .forEach(miembro => {
          html += `
            <li class="miembro-item">
              <span class="miembro-nombre">${miembro.nombre}</span>
              <span class="miembro-id">ID: ${miembro.idff}</span>
              <span class="miembro-telefono">📞 ${formatearTelefono(miembro.telefono)}</span>
            </li>
          `;
        });
      
      html += `</ul></div>`;
    });

    lista.innerHTML = html || '<p>No hay miembros registrados aún.</p>';
  } catch (error) {
    console.error("Error al cargar miembros:", error);
    lista.innerHTML = `
      <div class="error">
        <p>Error al cargar miembros</p>
        <button onclick="mostrarMiembros()">Reintentar</button>
      </div>
    `;
  }
}

// Formatear número de teléfono
function formatearTelefono(numero) {
  if (!numero) return 'N/A';
  const soloNumeros = numero.toString().replace(/\D/g, '');
  return soloNumeros.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
}

// Inicializar
document.addEventListener('DOMContentLoaded', mostrarMiembros);