const admin = require("firebase-admin");

admin.initializeApp({
  storageBucket: "ecotech-v1.appspot.com",
});
// admin.storage().bucket();

// Acessa os serviços do Firebase (Firestore, Auth e Storage)
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage().bucket(); // Bucket direto

module.exports = {db, auth, storage, admin};
