import {connectDatabase} from './database.mjs';
import {migrateStorage} from './storage.mjs';

const db = await connectDatabase();
await migrateStorage(db);

const {rows} = await db.query('SELECT count(*) AS count FROM orders');
await db.transaction(async tx => {
 await tx.query('DELETE FROM orders');
 await tx.query('UPDATE app_state SET revision = revision + 1 WHERE id = 1');
});

console.log(`Supprimé ${rows[0].count} commande(s). Restaurants, produits et catégories non touchés.`);
await db.close();
