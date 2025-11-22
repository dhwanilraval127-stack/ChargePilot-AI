import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../../database');
const dbPath = path.join(dbDir, 'db.json');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const adapter = new JSONFile(dbPath);
const defaultData = {
  users: [],
  stations: [],
  reviews: [],
  reports: [],
  trips: [],
  sessions: [],
  claims: []
};

const db = new Low(adapter, defaultData);

await db.read();

if (!db.data) {
  db.data = defaultData;
  await db.write();
}

export default db;