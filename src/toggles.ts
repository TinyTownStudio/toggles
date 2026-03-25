import type { DB } from "sqlite";
import { query, sql } from "./db.ts";

export type Toggle = {
  id: number;
  name: string;
  enabled: boolean;
};

type ToggleRow = { id: number; name: string; enabled: number };

function toToggle(row: ToggleRow): Toggle {
  return { ...row, enabled: row.enabled === 1 };
}

export function listToggles(db: DB): Toggle[] {
  return query<ToggleRow>(db, sql`SELECT id, name, enabled FROM toggles`)
    .map(toToggle);
}

export function getToggle(db: DB, name: string): Toggle | undefined {
  const rows = query<ToggleRow>(
    db,
    sql`SELECT id, name, enabled FROM toggles WHERE name = ${name}`,
  );
  return rows[0] ? toToggle(rows[0]) : undefined;
}

export function createToggle(db: DB, name: string): Toggle {
  query(db, sql`INSERT INTO toggles (name) VALUES (${name})`);
  const toggle = getToggle(db, name);
  if (!toggle) throw new Error(`Failed to create toggle: ${name}`);
  return toggle;
}

export function setEnabled(db: DB, name: string, enabled: boolean): number {
  query(db, sql`UPDATE toggles SET enabled = ${enabled ? 1 : 0} WHERE name = ${name}`);
  return db.changes;
}
