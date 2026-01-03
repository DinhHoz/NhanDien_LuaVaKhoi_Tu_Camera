# --- Stage base: cài node + dependencies ---
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# --- Stage development ---
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
# docker compose up --build 

# --- Stage production ---
FROM base AS prod
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
# docker build -t fire-backend --target prod .
# docker run -d -p 3000:3000 fire-backend