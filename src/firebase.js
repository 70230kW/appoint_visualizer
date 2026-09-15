import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { resolveFirebaseConfig } from "./firebase-config";
const env = import.meta.env;
const config = resolveFirebaseConfig(env);
export const configured = !!config;
const app = configured ? initializeApp(config) : null;
export const auth = app && getAuth(app),
  db = app && getFirestore(app),
  functions = app && getFunctions(app, "asia-northeast1");
if (app && env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
