// script.js
import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const form = document.getElementById('registroForm');
const lista = document.getElementById('listaMiembros');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const idff = document.getElementById('idff').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const escuadra = document.getElementById('escuadra').value;

  if (!nombre || !idff || !telefono || !escuadra) {
    alert("Completa todos los campos.");
    return;
  }

  try {
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

async function mostrarMiembros() {
  lista.innerHTML = "Cargando...";

  const miembrosSnap = await getDocs(query(collection(db, "miembros"), orderBy("escuadra")));
  const escuadras = {};

  miembrosSnap.forEach(doc => {
    const d = doc.data();
    if (!escuadras[d.escuadra]) escuadras[d.escuadra] = [];
    escuadras[d.escuadra].push(d);
  });

  let html = '';
  Object.keys(escuadras).forEach(nombre => {
    html += `<h3>${nombre}</h3><ul>`;
    escuadras[nombre].forEach(m => {
      html += `<li><strong>${m.nombre}</strong> | ID: ${m.idff} | 📞 ${m.telefono}</li>`;
    });
    html += '</ul>';
  });

  lista.innerHTML = html || "No hay miembros aún.";
}

// Mostrar lista al cargar
mostrarMiembros();
