import admin from 'firebase-admin';

// Inicializar Firebase Admin usando credenciales por defecto
const app = admin.initializeApp({
  projectId: 'lobby-master-690ed'
});

const db = admin.firestore();

async function addAdmins() {
  try {
    const configRef = db.collection('config').doc('admin');
    const doc = await configRef.get();

    let existingEmails = [];
    if (doc.exists) {
      existingEmails = doc.data().adminEmails || [];
      console.log('Emails actuales:', existingEmails);
    }

    const newEmails = [...new Set([
      ...existingEmails,
      'soporte@luqueacademy.com',
      'tech@luqueacademy.com'
    ])];

    if (doc.exists) {
      await configRef.update({ adminEmails: newEmails });
    } else {
      await configRef.set({ adminEmails: newEmails });
    }

    console.log('✓ Admins agregados exitosamente');
    console.log('Emails finales:', newEmails);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addAdmins();
