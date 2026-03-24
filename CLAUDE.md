# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

```bash
deno run src/index.ts
```

This requires `--allow-read` and `--allow-write` permissions for the SQLite file. Deno may prompt for these at runtime.

## Tech stack

- **Runtime:** Deno
- **Database:** SQLite via `deno.land/x/sqlite@v3.9.1`

## Architecture

The project is a single-file Deno app (`src/index.ts`) that opens a local SQLite database (`test.db`), runs DDL/DML, queries results, and closes the connection.

`deno.json` maps the `sqlite` import specifier to the Deno registry module. No tasks are defined yet.

## Basic Agent Rules
[AGENTS.md](/AGENTS.md)