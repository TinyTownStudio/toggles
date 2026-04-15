FROM node:24

RUN apt -yy update && apt -yy install sqlite3 libsqlite3-0

ENV PORT=3000

EXPOSE 3000

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

RUN npm i -g corepack@latest && corepack enable && pnpm i --frozen-lockfile

RUN mkdir -p ./packages/app

COPY ./packages/app ./packages/app/

RUN cd packages/app && pnpm i --frozen-lockfile && pnpm vite build

CMD ["node","packages/app/dist/node-server/index.js"]
