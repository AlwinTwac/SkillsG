const admin = require('firebase-admin');
const { restore } = require('firestore-export-import');
const fs = require('fs');

const serviceAccount = require('./newSAK.json');
const databaseURL = 'https://dummy.firebaseio.com';  // can still be dummy for Firestore

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL,
});

const firestore = admin.firestore();

// Load the backup JSON
const backupData = JSON.parse(fs.readFileSync('firestore-backup.json', 'utf8'));

async function startImport() {
  try {
    await restore(firestore, backupData);
    console.log('✅ Firestore import completed successfully.');
  } catch (err) {
    console.error('❌ Firestore import failed:', err);
  }
}

startImport();
