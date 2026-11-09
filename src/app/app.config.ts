import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

// Reemplaza los valores entre comillas con las llaves copiadas de tu Firebase Console
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "tick-tock-29b49.firebaseapp.com",
  projectId: "tick-tock-29b49",
  storageBucket: "tick-tock-29b49.appspot.com",
  messagingSenderId: "TU_SENDER_ID_AQUI",
  appId: "TU_APP_ID_AQUI"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore())
  ]
};