const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');
const databaseURL = 'https://dummy.firebaseio.com';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL,
});

const firestore = admin.firestore();

(async () => {
  const collections = await firestore.listCollections();
  console.log('Collections:');
  collections.forEach(col => console.log(`- ${col.id}`));
})();
