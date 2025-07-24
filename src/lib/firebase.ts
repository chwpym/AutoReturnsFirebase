// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

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
const db = getFirestore(app);

enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a time.
      // ...
      console.warn("Firestore persistence failed: multiple tabs open.");
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      // ...
      console.error("Firestore persistence is not available in this browser.");
    }
  });


export { db };
