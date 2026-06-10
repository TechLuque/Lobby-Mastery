# Desplegar en Vercel

## Opción 1: Deploy Automático desde GitHub (Recomendado)

### 1. Preparar GitHub
```bash
# Asegurate de tener git configurado
git config --global user.name "Tu Nombre"
git config --global user.email "tu.email@example.com"

# Iniciar repositorio (si no existe)
git init
git add .
git commit -m "Initial commit - Luque Academy"

# Crear repositorio en GitHub y subir
git remote add origin https://github.com/tu-usuario/tu-repo.git
git branch -M main
git push -u origin main
```

### 2. Conectar Vercel
1. Entra a [vercel.com](https://vercel.com)
2. Sign in con GitHub
3. Click en "New Project"
4. Selecciona tu repositorio `tu-repo`
5. **Framework**: Vite
6. **Build Command**: `npm run build`
7. **Output Directory**: `dist`

### 3. Configurar Variables de Entorno en Vercel
En la configuración del proyecto (Project Settings > Environment Variables), agrega:

```
VITE_FIREBASE_API_KEY=AIzaSyCT9DNf71aplxi5rQaUynCT49WyK2Qt3U0
VITE_FIREBASE_AUTH_DOMAIN=lobby-master-690ed.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=lobby-master-690ed
VITE_FIREBASE_STORAGE_BUCKET=lobby-master-690ed.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=987203694911
VITE_FIREBASE_APP_ID=1:987203694911:web:83ffa43fe1c78d5c24e38a
VITE_FIREBASE_MEASUREMENT_ID=G-VZFME5789Z
VITE_CLOUD_FUNCTION_URL=https://us-central1-lobby-master-690ed.cloudfunctions.net/getZoomMeetingLink
```

### 4. Deploy
- El deploy se dispara automáticamente cada vez que hagas `git push` a `main`
- Vercel se encargará de:
  - Instalar dependencias (`npm install`)
  - Compilar el proyecto (`npm run build`)
  - Servir el sitio en una URL de Vercel

---

## ¿Qué NO se despliega en Vercel?

- ❌ **Cloud Functions** - Las funciones quedan en Google Cloud (ya desplegadas)
- ❌ **Firebase** - La base de datos sigue siendo serverless en Google

## ¿Qué SÍ se despliega en Vercel?

- ✅ Frontend React/Vite compilado
- ✅ Vistas (Login, Lobby, Salas, Admin Dashboard)
- ✅ Comunicación con Firebase y Cloud Functions

---

## Verificar el Deploy

### En Local (antes de subir)
```bash
npm run build
npm run preview
```

Debe abrirse en `http://localhost:4173` y verse exactamente igual que en desarrollo.

### En Vercel
1. Después del deploy, Vercel te da una URL como: `https://tu-proyecto.vercel.app`
2. Verifica que:
   - ✅ Se abre el login
   - ✅ Puedes ingresar con un usuario
   - ✅ Ves el lobby
   - ✅ Puedes entrar a una sala y conectar con Zoom
   - ✅ El admin puede loguearse

---

## Solucionar Problemas

### Error: "VITE_FIREBASE_API_KEY is not set"
→ Verifica que las variables están en Vercel Settings > Environment Variables

### Error: "Cloud Function not responding"
→ Verifica que VITE_CLOUD_FUNCTION_URL es correcta en Vercel

### Error: 404 en rutas
→ Vercel necesita configuración de SPA. Ya está en `vercel.json` ✓

---

## Dominio Personalizado (Opcional)

1. En Vercel Settings > Domains
2. Agrega tu dominio (ej: `luqueacademy.com`)
3. Apunta el DNS de tu dominio a Vercel
   - Tipo: `CNAME`
   - Valor: `cname.vercel.sh`

---

## Actualizar el Código

Después de cualquier cambio:
```bash
git add .
git commit -m "Descripción del cambio"
git push origin main
```

Vercel automáticamente:
1. Detecta los cambios
2. Ejecuta el build
3. Despliega la nueva versión

¡Listo! El sitio actualizado estará en vivo en segundos.
