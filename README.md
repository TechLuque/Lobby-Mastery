# Luque Academy - Platform de Educación

Una plataforma completa de educación en línea con integración de Zoom, gestión de usuarios y panel de administración.

## 🎯 Características

- **Autenticación**: Login con email (sin contraseña para usuarios)
- **Salas de Clase**: 3 salas principales (Código del Dinero, La Máquina, Maestría del Dinero)
- **Integración Zoom**: Conéctate automáticamente a reuniones de Zoom
- **Panel Admin**: Gestiona usuarios, importa CSV, configura Meeting IDs
- **Firebase**: Autenticación, Firestore para datos, Cloud Functions para servidor

## 🚀 Desplegar en Vercel

Lee el archivo [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones completas.

**Resumen rápido:**
1. Sube el código a GitHub
2. Conecta el repositorio en [vercel.com](https://vercel.com)
3. Configura las variables de entorno
4. ¡Listo! El sitio se despliega automáticamente

## 💻 Desarrollo Local

### Requisitos
- Node.js 18+
- npm o yarn

### Instalación
```bash
npm install
```

### Ejecutar en desarrollo
```bash
npm run dev
```
Se abrirá en `http://localhost:5173`

### Build para producción
```bash
npm run build
npm run preview
```

### Verificar antes de deploy
```bash
npm run build
npm run preview
```
Abre la URL mostrada y verifica que funciona todo igual que en desarrollo.

## 📁 Estructura del Proyecto

```
src/
├── config/
│   └── firebase.js          # Configuración de Firebase
├── pages/
│   ├── Login/              # Página de login
│   ├── Lobby/              # Landing page
│   ├── Codigo/             # Sala 1: Código del Dinero
│   ├── Maquina/            # Sala 2: La Máquina
│   ├── Maestria/           # Sala 3: Maestría del Dinero
│   └── Administrador/      # Panel admin
├── services/
│   ├── authService.js      # Autenticación
│   ├── userService.js      # Gestión de usuarios
│   └── zoomService.js      # Integración Zoom
└── App.jsx                 # Router principal

functions/
├── index.js                # Cloud Functions
├── .env                    # Variables secretas (NO subir a Git)
└── package.json
```

## 🔐 Variables de Entorno

### En local: `.env.local`
Copia el contenido de `.env.example` y completa con tus credenciales.

### En Vercel
Agrega las variables en: Project Settings > Environment Variables
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- etc. (ver DEPLOYMENT.md)

## 🔄 Flujo de Desarrollo

1. Haz cambios en el código
2. Verifica en `npm run dev`
3. Haz commit: `git add . && git commit -m "Descripción"`
4. Sube a GitHub: `git push origin main`
5. Vercel automáticamente:
   - Detecta los cambios
   - Compila el proyecto
   - Despliega la nueva versión

## 📞 Cloud Functions

Las Cloud Functions están en la carpeta `functions/` y ya están desplegadas en Google Cloud.

Para actualizar las funciones:
```bash
firebase deploy --only functions
```

## 🛠️ Tecnologías Usadas

- **Frontend**: React 19 + Vite + React Router DOM
- **Backend**: Firebase (Auth, Firestore) + Google Cloud Functions
- **Zoom API**: Server-to-Server OAuth
- **Hosting**: Vercel (Frontend) + Google Cloud (Backend)
- **CSS**: Montserrat Font + Custom CSS

## 📝 Notas de Seguridad

- ✅ Nunca subir `.env` ni `functions/.env` a Git
- ✅ Las credenciales de Firebase están protegidas en Firestore Rules
- ✅ Las Cloud Functions validan tokens de Firebase
- ✅ El `.gitignore` ya está configurado

## 🆘 Soporte

Para problemas de deploy, revisar:
- Browser Console (F12) para errores
- Vercel Dashboard > Logs
- Firebase Console para datos de Firestore
