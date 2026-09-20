import {decodeBackup} from './backup-crypto.mjs';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {connectDatabase} from './database.mjs';
import {migrateStorage,saveSnapshot} from './storage.mjs';

const file = process.argv[2];
if (!file) {
 console.error('Usage: node backend/restore-db.mjs .data/backups/snapshot-...json');
 process.exit(1);
}

const data = decodeBackup(await readFile(resolve(file), 'utf8'),process.env.BACKUP_ENCRYPTION_KEY);
const db = await connectDatabase();
await db.query('INSERT IGNORE INTO app_state(id,data) VALUES(1,$1)',[JSON.stringify(data)]);
await migrateStorage(db);
await db.transaction(async tx => {
 await saveSnapshot(tx, data);
 await tx.query('UPDATE app_state SET revision = revision + 1 WHERE id = 1');
});
console.log('Base restaurée depuis', file);
await db.close();
