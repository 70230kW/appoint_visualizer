import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFirebaseConfig } from '../src/firebase-config.js';
test('provided production project is configured without host environment variables', () => {
  const config = resolveFirebaseConfig();
  assert.equal(config.projectId, 'appointment-visualizer');
  assert.equal(config.appId, '1:923948760297:web:b83aabb2b9489be2d2c478');
  assert.equal(resolveFirebaseConfig({VITE_FIREBASE_API_KEY:''}).apiKey, config.apiKey);
});
test('emulator and alternate projects require a complete independent configuration', () => {
  assert.equal(resolveFirebaseConfig({VITE_USE_EMULATORS:'true'}), null);
  assert.equal(resolveFirebaseConfig({VITE_FIREBASE_PROJECT_ID:'other'}), null);
  const env={VITE_USE_EMULATORS:'true',VITE_FIREBASE_PROJECT_ID:'demo-appoint',VITE_FIREBASE_API_KEY:'fake',VITE_FIREBASE_AUTH_DOMAIN:'localhost',VITE_FIREBASE_APP_ID:'fake'};
  assert.equal(resolveFirebaseConfig(env).projectId,'demo-appoint');
});
