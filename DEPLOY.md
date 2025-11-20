# Despliegue del Backend a Railway

## Paso 1: Preparar Railway

1. Ve a **https://railway.app**
2. Haz click en **"Start a New Project"**
3. Selecciona **"Deploy from GitHub repo"** o **"Empty Project"**

## Paso 2: Si usas GitHub (Recomendado)

### Crear repositorio:
```bash
cd /home/iker/.gemini/el-impostor/server
git init
git add .
git commit -m "Backend para El Impostor"
```

### Crear repo en GitHub:
1. Ve a https://github.com/new
2. Nombre: `el-impostor-server`
3. No inicialices con README

### Subir código:
```bash
git remote add origin https://github.com/TU_USUARIO/el-impostor-server.git
git branch -M main
git push -u origin main
```

### En Railway:
1. Click en **"Deploy from GitHub repo"**
2. Selecciona `el-impostor-server`
3. Railway detectará Node.js automáticamente
4. Espera a que termine el deploy

## Paso 3: Si prefieres Deploy Directo (Más Simple)

### Desde terminal:
```bash
cd /home/iker/.gemini/el-impostor/server
npx railway login
npx railway init
npx railway up
```

## Paso 4: Obtener URL

1. En Railway, ve a tu proyecto
2. Click en **"Settings"** → **"Networking"**
3. Click en **"Generate Domain"**
4. Copia la URL (ejemplo: `el-impostor-server-production.up.railway.app`)

## Paso 5: Avisar

Una vez tengas la URL del servidor, dímela y actualizaré el frontend.

---

## Alternativa: Render

Si Railway da problemas, puedes usar Render:

1. Ve a https://render.com
2. **"New +" → "Web Service"**
3. Conecta GitHub repo o sube directamente
4. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Deploy y copia la URL
