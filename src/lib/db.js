import { createClient } from '@libsql/client/web';

let db;

export default function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
    }

    db = createClient({
      url,
      authToken,
    });
  }
  return db;
}
