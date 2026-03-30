FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY env-config.template.js /usr/share/nginx/html/env-config.template.js
COPY docker-entrypoint.sh /docker-entrypoint.d/40-env-config.sh
RUN chmod +x /docker-entrypoint.d/40-env-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
