# build stage
FROM node:16-alpine AS build

# install dependencies
WORKDIR /app
# Copy all local files into the image.
COPY . .
RUN npm --proxy=http://10.164.225.9:8080 ci

ENV NODE_ENV=production
ENV KHEM_DB_HOST=host.docker.internal
ENV KHEM_DB_PASS=somerandompassword

RUN npm run build

# deploy stage
FROM node:16-alpine

WORKDIR /app
COPY --from=build /app/build ./
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "./index.js"]
