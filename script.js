// script.js
import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const form = document.getElementById('registroForm');
const lista = document.getElementById('listaMiembros');
const escuadraSelect = document.getElementById('escuadra');

async function mostrarMiembros() {
  const miembrosSnap = await getDocs(query(collection(db, "miembros"), orderBy("escuadra")));
  const escuadras = {};

  miembrosSnap.forEach(doc => {
    const d = doc.data();
    if (!escuadras[d.escuadra]) escuadras[d.escuadra] = [];
    escuadras[d.escuadra].push(d);
  });

  // Mostrar miembros
  let html = '';
  Object.keys(escuadras).forEach(nombre => {
    html += `<h3>${nombre}</h3><ul>`;
    escuadras[nombre].forEach(m => {
      html += `<li><strong>${m.nombre}</strong> | ID: ${m.idff} | 📞 ${m.telefono}</li>`;
    });
    html += '</ul>';
  });

  lista.innerHTML = html || "No hay miembros aún.";

  // Cargar escuadras disponibles (máx. 4)
  escuadraSelect.innerHTML = '<option value="">Selecciona una escuadra</option>';
  for (let i = 1; i <= 14; i++) {
    const nombre = `Escuadra ${i}`;
    const miembros = escuadras[nombre] || [];
    if (miembros.length < 4) {
      escuadraSelect.innerHTML += `<option value="${nombre}">${nombre} (${miembros.length}/4)</option>`;
    }
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const idff = document.getElementById('idff').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const escuadra = escuadraSelect.value;

  if (!nombre || !idff || !telefono || !escuadra || isNaN(idff)) {
    alert("Completa todos los campos correctamente.");
    return;
  }

  try {
    const miembrosSnap = await getDocs(query(collection(db, "miembros")));
    const miembros = [];
    miembrosSnap.forEach(doc => {
      if (doc.data().escuadra === escuadra) {
        miembros.push(doc.data());
      }
    });

    if (miembros.length >= 4) {
      alert("❌ Esa escuadra ya está llena.");
      await mostrarMiembros();
      return;
    }

    await addDoc(collection(db, 'miembros'), {
      nombre,
      idff,
      telefono,
      escuadra,
      timestamp: new Date()
    });

    alert("✅ ¡Registrado!");
    form.reset();
    mostrarMiembros();
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Hubo un error.");
  }
});

mostrarMiembros();
