# 🔧 Solucionar Error "Failed to fetch" en Reuniones Zoom

## Problema
Cuando los estudiantes intentan unirse a una reunión de Zoom, reciben el error:
```
Error: Error al conectar: Failed to fetch
```

## Causa Raíz
Falta configurar:
1. Los Meeting IDs de Zoom en el panel de administrador
2. Las credenciales de Zoom en las Cloud Functions
3. La Cloud Function está desplegada pero sin las variables necesarias

---

## ✅ Solución Paso a Paso

### Paso 1: Obtener Credenciales de Zoom

1. Ve a [Zoom App Marketplace](https://marketplace.zoom.us)
2. Crea una nueva aplicación "Server-to-Server OAuth"
3. Guarda estos valores:
   - `Account ID`
   - `Client ID`
   - `Client Secret`

También obtén los **Meeting IDs** de tus reuniones:
- Meeting ID de Código
- Meeting ID de Máquina
- Meeting ID de Maestría

### Paso 2: Configurar Cloud Functions con Variables de Entorno

1. Abre la terminal en la carpeta del proyecto
2. Ejecuta:
   ```bash
   firebase functions:config:set zoom.account_id="TU_ACCOUNT_ID"
   firebase functions:config:set zoom.client_id="TU_CLIENT_ID"
   firebase functions:config:set zoom.client_secret="TU_CLIENT_SECRET"
   ```

3. Verifica que se guardó:
   ```bash
   firebase functions:config:get
   ```

4. Despliega las funciones actualizado:
   ```bash
   firebase deploy --only functions
   ```

### Paso 3: Configurar Meeting IDs desde el Dashboard de Admin

1. Inicia sesión como administrador
2. Ve al tab de "Zoom Configuration"
3. Ingresa los tres Meeting IDs:
   - **ZOOM_CODIGO_ID**: Meeting ID para la sala de Código
   - **ZOOM_MAQUINA_ID**: Meeting ID para la sala de Máquina
   - **ZOOM_MAESTRIA_ID**: Meeting ID para la sala de Maestría
4. Haz clic en "Guardar"

### Paso 4: Verificar la Configuración

1. Abre la consola del navegador (F12)
2. Intenta unirte a una reunión
3. Deberías ver logs indicando que el link se está generando
4. Si aún hay problemas, busca estos errores en la consola

---

## 🐛 Diagnosticar Problemas

### Error: "No existe configuración de Zoom en Firestore"
→ El admin no guardó los Meeting IDs. Completa el **Paso 3**.

### Error: "No se pudo obtener token de Zoom"
→ Las credenciales están mal configuradas. Verifica:
   ```bash
   firebase functions:config:get
   ```

### Error CORS o "Failed to fetch"
→ La Cloud Function puede tener permisos incorridos. Verifica:
   ```bash
   firebase deploy --only functions
   ```

---

## 📋 Checklist Final

- [ ] Credentials de Zoom obtenidas (Account ID, Client ID, Client Secret)
- [ ] Variables de entorno configuradas con `firebase functions:config:set`
- [ ] Cloud Functions desplegadas con `firebase deploy --only functions`
- [ ] Meeting IDs guardados desde el dashboard de admin
- [ ] Probaste unir a un estudiante a una reunión

---

## 📞 Si el Problema Persiste

1. Revisa los logs de Cloud Functions:
   ```bash
   firebase functions:log
   ```

2. Busca errores específicos y la trace completa

3. Verifica que la reunión de Zoom existe y que el ID es correcto
