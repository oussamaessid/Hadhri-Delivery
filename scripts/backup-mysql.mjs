// Export a consistent logical snapshot using the application's MySQL driver.
// Contains accounts and sessions: keep the encrypted file outside public/ and Git.
import {mkdir,writeFile} from 'node:fs/promises';
import {connectDatabase} from '../backend/database.mjs';
import {encodeBackup} from '../backend/backup-crypto.mjs';
if(!/^[a-f0-9]{64}$/i.test(process.env.BACKUP_ENCRYPTION_KEY||''))throw new Error('BACKUP_ENCRYPTION_KEY de 64 caractères hexadécimaux requis.');
const db=await connectDatabase();
try{
 const tables=['app_state','admin_account','customer_accounts','sessions','merchants','categories','products','departments','customers','drivers','orders','notifications','seed_history','admin_login_limits'];
 const backup=await db.transaction(async tx=>{
  // All application writers acquire this row before modifying the catalogue.
  await tx.query('SELECT id FROM app_state WHERE id=1 LOCK IN SHARE MODE');
  const result={format:'hadhri-mysql-tables-v1',createdAt:new Date().toISOString(),tables:{}};
  for(const table of tables)result.tables[table]=(await tx.query(`SELECT * FROM ${table}`)).rows;
  return result;
 });
 await mkdir('.data/sql-backups',{recursive:true});
 const file='.data/sql-backups/mysql-'+Date.now()+'.encrypted.json';
 await writeFile(file,encodeBackup(backup,process.env.BACKUP_ENCRYPTION_KEY),{mode:0o600,flag:'wx'});
 console.log('Sauvegarde MySQL chiffrée : '+file);
}finally{await db.close()}
