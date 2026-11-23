FROM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY *.js ./
COPY public/ public/
COPY test/ test/
USER node
RUN npm test
EXPOSE 4173
CMD ["node", "server.js"]
