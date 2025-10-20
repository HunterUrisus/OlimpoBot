# --- Stage 1: Build Stage ---
# Usamos una imagen oficial de Node.js como base. La versión 18 es una LTS (Long Term Support) estable.
FROM node:18-alpine AS builder

# Establecemos el directorio de trabajo dentro del contenedor.
WORKDIR /usr/src/app

# Copiamos los archivos de dependencias.
# Copiarlos por separado aprovecha el cache de Docker si no cambian.
COPY package*.json ./

# Instalamos las dependencias del proyecto.
# --only=production asegura que solo se instalen las dependencias necesarias para correr el bot, no las de desarrollo.
RUN npm install --only=production

# Copiamos el resto de los archivos de la aplicación.
COPY . .

# --- Stage 2: Production Stage ---
# Usamos una imagen más ligera para la versión final, lo que reduce el tamaño.
FROM node:18-alpine

# Establecemos el directorio de trabajo.
WORKDIR /usr/src/app

# Copiamos las dependencias instaladas y los archivos del bot desde la etapa anterior.
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app .

# Comando que se ejecutará cuando el contenedor se inicie.
CMD ["npm", "start"]