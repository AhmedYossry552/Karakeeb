# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build -- --configuration production

FROM node:20-alpine AS runtime
WORKDIR /app

# Serve the built Angular app on Railway's PORT.
RUN npm install -g serve
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["sh", "-c", "serve -s dist/recycling-system-angular -l ${PORT:-8080}"]
