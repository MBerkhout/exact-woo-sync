import postgres from "postgres";

let sqlSingleton: ReturnType<typeof postgres> | null = null;

/** Server-side Postgres client using DATABASE_URL (service credentials). */
export function getAdminSql(): ReturnType<typeof postgres> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  if (!sqlSingleton) {
    sqlSingleton = postgres(url, { max: 5 });
  }
  return sqlSingleton;
}
