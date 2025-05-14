// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED 
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBm9vDoLZE9slgQMg-ZoFEz2wvTR4-Fqws",
  authDomain: "clan-lovels.firebaseapp.com",
  projectId: "clan-lovels",
  storageBucket: "clan-lovels.appspot.com",
  messagingSenderId: "833416319157",
  appId: "1:833416319157:web:3a5cbeb80a10ff76e46efc",
  measurementId: "G-805JVFB2JQ"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Configura Firestore con persistencia offline
const db = getFirestore(app);
db.settings({
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Habilita la persistencia offline
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Persistencia offline no disponible en múltiples pestañas");
    } else if (err.code === 'unimplemented') {
      console.warn("Persistencia offline no soportada en este navegador");
    }
  });

export { db };