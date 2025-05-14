// script.js
import { db } from './firebase-config.js';
import { ref, push, set } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

document.getElementById('registroForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const escuadra = document.getElementById('escuadra').value;

  if (!nombre || !telefono || !escuadra) {
    alert("Por favor completa todos los campos.");
    return;
  }

  const miembrosRef = ref(db, "miembros");
  const nuevoMiembroRef = push(miembrosRef);

  set(nuevoMiembroRef, {
    nombre,
    telefono,
    escuadra
  })
  .then(() => {
    alert("Miembro registrado con éxito 💖");
    document.getElementById('registroForm').reset();
  })
  .catch((error) => {
    alert("Error al registrar: " + error.message);
  });
});
