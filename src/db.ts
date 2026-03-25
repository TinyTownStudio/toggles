import { DB } from "sqlite";

export function openDb(path = "test.db"): DB {
  const db = new DB(path);
  db.execute(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )
  `);
  return db;
}
