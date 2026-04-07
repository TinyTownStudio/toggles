FROM denoland/deno:debian

RUN apt -yy update && apt -yy install sqlite3 libsqlite3-0

ENV PORT=3000

EXPOSE 3000

WORKDIR /app

COPY ./deno_main.ts deno_main.ts
COPY ./api ./api
COPY package.json .

RUN mkdir -p /app/dist
COPY ./dist/client /dist/client

RUN deno install 

# TODO: copy drizzle in

CMD ["deno", "run", "-A", "--unstable-sloppy-imports", "./deno_main.ts"]

