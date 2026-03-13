# SELVA IMPORT - Guia de Despliegue

## Requisitos Previos

- **Node.js** 18 o superior
- **PostgreSQL** 14 o superior
- **npm** 9 o superior
- Cuenta de **Cloudinary** (para subida de imagenes)

## 1. Clonar e Instalar

```bash
git clone <tu-repositorio>
cd selva-import
npm install
```

## 2. Variables de Entorno

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env
```

### Variables requeridas:

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexion a PostgreSQL | `postgresql://user:pass@localhost:5432/selva_import` |
| `SESSION_SECRET` | Secreto para sesiones (minimo 32 caracteres) | Genera con `openssl rand -hex 32` |
| `CLOUDINARY_CLOUD_NAME` | Nombre de tu cloud en Cloudinary | `mi-cloud` |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary | `123456789` |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary | `abc123...` |

### Variables opcionales:

| Variable | Descripcion | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `5000` |
| `ADMIN_EMAIL` | Email del admin inicial | `admin@selvaimport.com` |
| `ADMIN_PASSWORD` | Contraseña del admin inicial | `admin123` |
| `VITE_WHATSAPP_NUMBER` | Numero de WhatsApp (con codigo de pais) | `51998130656` |
| `NODE_ENV` | Entorno de ejecucion | `production` |

**IMPORTANTE:** `VITE_WHATSAPP_NUMBER` se incluye en el build del frontend. Si lo cambias, debes recompilar con `npm run build`.

## 3. Base de Datos

### Crear la base de datos:

```bash
createdb selva_import
```

### Sincronizar el esquema:

```bash
npm run db:push
```

Esto crea todas las tablas necesarias. Al iniciar la app por primera vez, se ejecuta un seed automatico que crea:
- Usuario administrador
- 10 categorias
- Productos de ejemplo
- Paginas legales (terminos, privacidad, envios, quienes somos)

### Migrar datos desde otro servidor:

Si tienes datos existentes, exporta con `pg_dump` e importa con `psql`:

```bash
# En el servidor origen
pg_dump -U usuario -d selva_import > backup.sql

# En el servidor destino
psql -U usuario -d selva_import < backup.sql
```

## 4. Desarrollo Local

```bash
npm run dev
```

Esto inicia el servidor Express + Vite dev server en `http://localhost:5000`.

## 5. Build para Produccion

```bash
npm run build
```

Esto compila:
- Frontend (React/Vite) -> `dist/public/`
- Backend (Express/TypeScript) -> `dist/index.cjs`

## 6. Ejecutar en Produccion

```bash
NODE_ENV=production npm run start
```

O directamente:

```bash
NODE_ENV=production node dist/index.cjs
```

El servidor sirve tanto la API como los archivos estaticos del frontend en el mismo puerto.

## 7. Despliegue en Servicios Populares

### Render

1. Crea un nuevo **Web Service**
2. Conecta tu repositorio
3. Configura:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Environment:** Node
4. Agrega las variables de entorno en la seccion Environment
5. Agrega un **PostgreSQL** database en Render y copia la `DATABASE_URL`
6. Render asigna `PORT` automaticamente

### Railway

1. Crea un nuevo proyecto desde tu repositorio
2. Agrega un servicio **PostgreSQL**
3. Configura las variables de entorno (Railway proporciona `DATABASE_URL` y `PORT` automaticamente)
4. Configura:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`

### VPS (Ubuntu/Debian)

1. Instala Node.js 18+ y PostgreSQL
2. Clona el repositorio
3. Instala dependencias: `npm install`
4. Configura `.env` con las variables de entorno
5. Crea la base de datos y ejecuta `npm run db:push`
6. Compila: `npm run build`
7. Usa PM2 para mantener el proceso:

```bash
npm install -g pm2
NODE_ENV=production pm2 start dist/index.cjs --name selva-import
pm2 save
pm2 startup
```

8. Configura Nginx como reverse proxy:

```nginx
server {
    listen 80;
    server_name tudominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

9. Configura SSL con Certbot:

```bash
sudo certbot --nginx -d tudominio.com
```

**Nota sobre cookies:** En produccion (`NODE_ENV=production`), las cookies de sesion se marcan como `secure: true` automaticamente (requiere HTTPS). Si tu servidor esta detras de un proxy sin SSL directo, agrega `COOKIE_SECURE=false` a las variables de entorno.

## 8. Archivos Publicos

Los siguientes archivos deben estar en `client/public/` para que la tienda funcione correctamente:

- `logo-selva-import.jpg` - Logo de la tienda
- `yape-qr.jpg` - Codigo QR de Yape para pagos

## 9. Estructura del Proyecto

```
selva-import/
├── client/              # Frontend React
│   ├── public/          # Archivos estaticos (logo, QR)
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilidades
│   │   └── pages/       # Paginas de la app
│   └── index.html
├── server/              # Backend Express
│   ├── auth.ts          # Autenticacion
│   ├── db.ts            # Conexion a PostgreSQL
│   ├── index.ts         # Entrada del servidor
│   ├── routes.ts        # API routes + seed
│   ├── static.ts        # Servir archivos en produccion
│   ├── storage.ts       # Capa de datos (CRUD)
│   └── vite.ts          # Vite dev server (solo desarrollo)
├── shared/              # Codigo compartido
│   ├── schema.ts        # Esquema de base de datos (Drizzle)
│   └── routes.ts        # Definiciones de API
├── script/
│   └── build.ts         # Script de compilacion
├── .env.example         # Plantilla de variables de entorno
├── drizzle.config.ts    # Configuracion de Drizzle
├── package.json
└── tsconfig.json
```

## 10. Errores Comunes

| Error | Causa | Solucion |
|-------|-------|----------|
| `DATABASE_URL must be set` | Falta la variable de entorno | Configura `DATABASE_URL` en `.env` |
| `Could not find the build directory` | No se ejecuto el build | Ejecuta `npm run build` |
| `EADDRINUSE` | El puerto ya esta en uso | Cambia `PORT` o detiene el proceso que lo usa |
| `relation does not exist` | Tablas no creadas | Ejecuta `npm run db:push` |
| Imagenes no se suben | Cloudinary mal configurado | Verifica las 3 variables de Cloudinary |
| Sesion no persiste | Cookie secure en HTTP | Asegurate que `secure: false` si no usas HTTPS |
| WhatsApp muestra numero viejo | Build desactualizado | Cambia `VITE_WHATSAPP_NUMBER` y ejecuta `npm run build` |
