FROM node:26

RUN apt -yy update && apt -yy install sqlite3 libsqlite3-0 build-essential python3

ENV PORT=3000

EXPOSE 3000

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

RUN printf 'public-hoist-pattern[]=better-sqlite3\npublic-hoist-pattern[]=dotenv\n' >> .npmrc

RUN npm i -g corepack@latest && corepack enable && pnpm i --frozen-lockfile

RUN mkdir -p ./packages/app

COPY ./packages/app ./packages/app/

ENV TOGGLES_SELF_HOST_BUILD=true
RUN cd packages/app && pnpm i --frozen-lockfile && pnpm add better-sqlite3 dotenv && pnpm vite build \
  && node -e "import('better-sqlite3').then(() => console.log('better-sqlite3 ready'))"

CMD ["node","packages/app/dist/node-server/index.js"]