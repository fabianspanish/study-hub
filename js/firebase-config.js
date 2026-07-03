// =============================================================
// FIREBASE CONFIG
// -------------------------------------------------------------
// Estas credenciais são públicas por design (qualquer um que abrir
// seu site no navegador as vê). A segurança real do Firebase vem
// de:
//   - Firestore Rules (em console.firebase.google.com)
//   - Domínios autorizados em Authentication > Settings
//   - Habilitar App Check (opcional, recomendado em produção)
//
// Por isso podem ficar versionadas no Git sem problemas.
// =============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyDLdH7zpKaO7eI1BwLtZF2GJ7MMiXUUTX4",
  authDomain: "study-hub-pessoal.firebaseapp.com",
  projectId: "study-hub-pessoal",
  storageBucket: "study-hub-pessoal.firebasestorage.app",
  messagingSenderId: "1097144774513",
  appId: "1:1097144774513:web:74397f26a52d33cc2890d0"
};

// Email do dono — único permitido a se cadastrar antes de a allowlist existir
export const OWNER_EMAIL = "fabianspanish@gmail.com";

// Detecta se está configurado de verdade
export const FIREBASE_CONFIGURED = !firebaseConfig.apiKey.includes("SUA_API_KEY");

// Versão do SDK Firebase (fixa pra evitar surpresas)
const SDK_VERSION = "10.13.0";
const CDN = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let _firebase = null;
let _loading = null;

/**
 * Carrega Firebase de forma idempotente.
 * Retorna { app, auth, db, storage, authMod, dbMod, storageMod } ou null se falhar.
 */
export async function loadFirebase() {
  if (_firebase) return _firebase;
  if (_loading) return _loading;
  if (!FIREBASE_CONFIGURED) return null;

  _loading = (async () => {
    try {
      const [appMod, authMod, dbMod, storageMod] = await Promise.all([
        import(`${CDN}/firebase-app.js`),
        import(`${CDN}/firebase-auth.js`),
        import(`${CDN}/firebase-firestore.js`),
        import(`${CDN}/firebase-storage.js`),
      ]);

      const app = appMod.initializeApp(firebaseConfig);
      const auth = authMod.getAuth(app);
      const db = dbMod.getFirestore(app);
      const storage = storageMod.getStorage(app);

      // Persistência local (mantém logado entre sessões do navegador)
      try {
        await authMod.setPersistence(auth, authMod.browserLocalPersistence);
      } catch (e) {
        console.warn('Falha ao definir persistência:', e);
      }

      _firebase = { app, auth, db, storage, authMod, dbMod, storageMod };
      return _firebase;
    } catch (err) {
      console.error('Firebase indisponível:', err);
      return null;
    } finally {
      _loading = null;
    }
  })();

  return _loading;
}
