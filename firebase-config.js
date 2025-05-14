// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBm9vDoLZE9slgQMg-ZoFEz2wvTR4-Fqws",
  authDomain: "clan-lovels.firebaseapp.com",
  projectId: "clan-lovels",
  storageBucket: "clan-lovels.firebasestorage.app",
  messagingSenderId: "833416319157",
  appId: "1:833416319157:web:3a5cbeb80a10ff76e46efc",
  measurementId: "G-805JVFB2JQ"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta la base de datos para usarla en otros archivos
export const db = getDatabase(app);
