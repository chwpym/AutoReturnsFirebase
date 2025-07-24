// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache, persistentLocalCache } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "autoreturns",
  appId: "1:358384091951:web:0262a566fcd9eb97fb17da",
  storageBucket: "autoreturns.firebasestorage.app",
  apiKey: "AIzaSyD0B0ShKWcrkEHA9vuirPopPqQ_nN0xXzM",
  authDomain: "autoreturns.firebaseapp.com",
  messagingSenderId: "358384091951",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and enable persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    // Force GC to be off.
    // TODO(CON-1703): Remove this when the issue is resolved.
    forceOwnership: true,
  }),
});

export { db };
