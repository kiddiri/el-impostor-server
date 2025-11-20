# Deploy Fácil con Render

Railway está deprecated, usa **Render** que es más simple:

## Opción 1: Deploy Directo (MÁS FÁCIL)

1. Ve a **https://render.com**
2. Click en **"Get Started"** y haz login con GitHub/Google
3. Click en **"New +" → "Web Service"**
4. Selecciona **"Public Git repository"**
5. Pega esta URL: `https://github.com` (o crea un repo temporal)

### O sube directamente:

1. En Render, click **"New +" → "Web Service"**
2. Conecta tu GitHub o usa **"Deploy from a Git repository"**
3. Configuración:
   - **Name**: `el-impostor-server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Click **"Create Web Service"**
5. Espera 2-3 minutos al deploy
6. Copia la URL (ejemplo: `https://el-impostor-server.onrender.com`)

## Opción 2: Desde GitHub (Recomendado)

```bash
cd /home/iker/.gemini/el-impostor/server
git init
git add .
git commit -m "Backend server"
git branch -M main
```

Luego:
1. Crea repo en GitHub: https://github.com/new
2. Nombre: `el-impostor-server`
3. Sube el código:
```bash
git remote add origin https://github.com/TU_USUARIO/el-impostor-server.git
git push -u origin main
```

4. En Render: **"New +" → "Web Service"** → Importa el repo
5. Deploy automático

## Cuando tengas la URL

Dime la URL completa (ejemplo: `https://el-impostor-server.onrender.com`) y actualizaré el frontend.
