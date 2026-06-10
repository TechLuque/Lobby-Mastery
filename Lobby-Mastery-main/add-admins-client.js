import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBpHwv7eHHuGw8PoqKhZlH_K3fQADULymc",
  authDomain: "lobby-master-690ed.firebaseapp.com",
  projectId: "lobby-master-690ed",
  storageBucket: "lobby-master-690ed.appspot.com",
  messagingSenderId: "779166706261",
  appId: "1:779166706261:web:d00cd6b77cfe5ab0cd3a89"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addAdmins() {
  try {
    const configRef = doc(db, 'config', 'admin');
    const configSnap = await getDoc(configRef);

    let existingEmails = [];
    if (configSnap.exists()) {
      existingEmails = configSnap.data().adminEmails || [];
      console.log('Emails actuales:', existingEmails);
    }

    const newEmails = [
      ...new Set([
        ...existingEmails,
        'soporte@luqueacademy.com',
        'tech@luqueacademy.com'
      ])
    ];

    await setDoc(configRef, { adminEmails: newEmails }, { merge: true });

    console.log('✓ Admins agregados exitosamente');
    console.log('Emails finales:', newEmails);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addAdmins();
