import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AgnosticDatabaseInstance } from "../types";

export async function getOwnedProject(
  db: AgnosticDatabaseInstance<typeof schema>,
  projectId: string,
  userId: string,
) {
  return db
    .select()
    .from(schema.project)
    .where(and(eq(schema.project.id, projectId), eq(schema.project.userId, userId)))
    .get();
}
