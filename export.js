const admin = require('firebase-admin');
const { backup } = require('firestore-export-import');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json');
const databaseURL = 'https://dummy.firebaseio.com';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL,
});

const firestore = admin.firestore();

const collectionsToBackup = [
  'attendance',
  'certificates',
  'courses',
  'enrollments',
  'interviewReports',
  'learningContent',
  'users'
];

async function startBackup() {
  try {
    let allData = {};

    for (const col of collectionsToBackup) {
      console.log(`Backing up collection: ${col}`);
      const data = await backup(firestore, col);
      allData = { ...allData, ...data };
    }

    fs.writeFileSync('firestore-backup.json', JSON.stringify(allData, null, 2));
    console.log('✅ Firestore backup completed successfully.');
  } catch (err) {
    console.error('❌ Backup failed:', err);
  }
}

startBackup();
