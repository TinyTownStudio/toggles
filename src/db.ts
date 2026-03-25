import type { QueryParameter } from "sqlite";
import { DB } from "sqlite";

export function openDb(path = "test.db"): DB {
  const db = new DB(path);
  db.execute(`
    CREATE TABLE IF NOT EXISTS toggles (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      name    TEXT    NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 0
    )
  `);
  return db;
}

export type SqlQuery = { text: string; values: QueryParameter[] };

type Interpolation = QueryParameter | SqlQuery;

function isSqlQuery(v: unknown): v is SqlQuery {
  return typeof v === "object" && v !== null && "text" in v && "values" in v;
}

export function sql(
  strings: TemplateStringsArray,
  ...values: Interpolation[]
): SqlQuery {
  for (let i = 0; i < values.length; i++) {
    if (values[i] === undefined) {
      throw new TypeError(
        `sql: interpolation at index ${i} is undefined. Use null for SQL NULL.`,
      );
    }
  }

  let text = "";
  const flatValues: QueryParameter[] = [];

  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      const v = values[i];
      if (isSqlQuery(v)) {
        text += v.text;
        flatValues.push(...v.values);
      } else {
        text += "?";
        flatValues.push(v as QueryParameter);
      }
    }
  }

  return { text, values: flatValues };
}

export function query<T extends Record<string, unknown>>(
  db: DB,
  q: SqlQuery,
): T[] {
  try {
    return db.queryEntries<T>(q.text, q.values);
  } catch (err) {
    const preview = q.text.length > 120 ? `${q.text.slice(0, 120)}...` : q.text;
    throw new Error(`query failed: ${preview}`, { cause: err });
  }
}
