FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN (npm ci && test -x node_modules/.bin/expo) || \
    (rm -rf node_modules && npm cache clean --force && npm ci && test -x node_modules/.bin/expo)

FROM node:20-alpine AS build
WORKDIR /app
ARG EXPO_PUBLIC_API_BASE_URL
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
ARG EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}
ENV EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID}
ENV EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run typecheck && npm run build:web && cp public/notifications-sw.js dist/notifications-sw.js

FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
