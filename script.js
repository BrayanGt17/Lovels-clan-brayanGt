// script.js
import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

document.getElementById('registroForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const escuadra = document.getElementById('escuadra').value;

  if (!nombre || !telefono || !escuadra) {
    alert("Por favor, completa todos los campos.");
    return;
  }

  try {
    await addDoc(collection(db, 'miembros'), {
      nombre,
      telefono,
      escuadra,
      timestamp: new Date()
    });

    alert("✅ ¡Registrado correctamente!");
    document.getElementById('registroForm').reset();
  } catch (error) {
    console.error("Error al registrar:", error);
    alert("❌ Error al registrar. Intenta de nuevo.");
  }
});
