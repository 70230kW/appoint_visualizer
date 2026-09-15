// Public Firebase Web SDK configuration; this is not an Admin credential.
export const publicFirebaseConfig = Object.freeze({
  apiKey: "AIzaSyDs0K0gSl2_ftsveN1lKT3SsWMwZrsyI6Q",
  authDomain: "appointment-visualizer.firebaseapp.com",
  projectId: "appointment-visualizer",
  storageBucket: "appointment-visualizer.firebasestorage.app",
  messagingSenderId: "923948760297",
  appId: "1:923948760297:web:b83aabb2b9489be2d2c478",
});

export function resolveFirebaseConfig(env = {}) {
  const override = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  // Never mix another project's credentials with the production defaults.
  const customProject = override.projectId && override.projectId !== publicFirebaseConfig.projectId;
  if (customProject || env.VITE_USE_EMULATORS === "true") {
    return Object.values(override).every(Boolean) ? override : null;
  }
  return {
    ...publicFirebaseConfig,
    ...Object.fromEntries(Object.entries(override).filter(([, value]) => value)),
  };
}
