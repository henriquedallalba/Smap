FROM node:24-alpine AS build
WORKDIR /site
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/dist/Smap/browser /usr/share/nginx/html
EXPOSE 80
