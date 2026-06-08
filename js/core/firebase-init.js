// js/core/firebase-init.js
import { ENV } from '../config/env.js';

class FirebaseService {
    constructor() {
        if (!firebase.apps.length) {
            firebase.initializeApp(ENV.FIREBASE_CONFIG);
        }
        this.db = firebase.database();
        this.auth = firebase.auth();
        this.storage = firebase.storage ? firebase.storage() : null;
    }

    getDb() { return this.db; }
    getAuth() { return this.auth; }
}

// Export as a Singleton
export const firebaseInstance = new FirebaseService();
export const db = firebaseInstance.getDb();
export const auth = firebaseInstance.getAuth();