import {readFile} from 'node:fs/promises';
import mysql from 'mysql2/promise';

// Statements are never split by ';' inside string/JSON literals in our migration files, so a naive split is safe.
function splitStatements(sql){return sql.split(';').map(s=>s.trim()).filter(Boolean)}
// Our SQL was written with Postgres-style $1,$2... placeholders; mysql2 uses positional '?'.
function toMysqlPlaceholders(sql){return sql.replace(/\$\d+/g,'?')}
// Some ALTER ... IF [NOT] EXISTS clauses aren't recognized on every MariaDB/MySQL build; treat their
// "already applied" errors as success so migrations stay idempotent across restarts.
const IGNORABLE_DDL_ERRORS=new Set(['ER_DUP_FIELDNAME','ER_CANT_DROP_FIELD_OR_KEY','ER_DUP_KEYNAME','ER_DUP_INDEX','ER_FK_DUP_NAME','ER_DUP_CONSTRAINT_NAME']);
// MariaDB has no "ADD CONSTRAINT ... FOREIGN KEY IF NOT EXISTS" syntax; re-adding an existing
// foreign key surfaces as a generic ER_CANT_CREATE_TABLE wrapping InnoDB errno 121 ("duplicate key
// name"). Detect that specific wrapped case instead of ignoring ER_CANT_CREATE_TABLE outright.
function isIgnorable(e){return IGNORABLE_DDL_ERRORS.has(e.code)||(e.code==='ER_CANT_CREATE_TABLE'&&/errno:\s*121\b/.test(e.message))}

function wrapConnection(runner){
 return {
  query:async(sql,params=[])=>{const [rows]=await runner.query(toMysqlPlaceholders(sql),params);return {rowCount:Array.isArray(rows)?rows.length:rows.affectedRows,rows:Array.isArray(rows)?rows.map(row=>({...row,...(typeof row.data==='string'?{data:JSON.parse(row.data)}:{})})):[]}},
  exec:async sql=>{for(let statement of splitStatements(sql))try{
   statement=statement.replace(/^--[^\n]*(?:\n|$)/gm,'').trim();
   const alteration=statement.match(/^ALTER TABLE (\w+) (ADD|DROP) (COLUMN|(?:UNIQUE )?INDEX|CONSTRAINT)(?: IF (?:NOT )?EXISTS)? (\w+)/i);
   if(alteration){
    const [,table,action,kind,name]=alteration;
    const index=kind.includes('INDEX'), column=kind==='COLUMN';
    const source=column?'COLUMNS':index?'STATISTICS':'TABLE_CONSTRAINTS';
    const nameColumn=column?'COLUMN_NAME':index?'INDEX_NAME':'CONSTRAINT_NAME';
    const schemaColumn=column||index?'TABLE_SCHEMA':'CONSTRAINT_SCHEMA';
    const [found]=await runner.query(`SELECT * FROM information_schema.${source} WHERE ${schemaColumn}=DATABASE() AND TABLE_NAME=? AND ${nameColumn}=?`,[table,name]);
    if(action==='ADD'&&found.length||action==='DROP'&&!found.length)continue;
    statement=statement.replace(/ IF (?:NOT )?EXISTS/i,'');
    if(action==='DROP'&&kind==='CONSTRAINT'){
     const [version]=await runner.query('SELECT VERSION() AS version');
     if(!version[0].version.includes('MariaDB'))statement=statement.replace('DROP CONSTRAINT',found[0].CONSTRAINT_TYPE==='FOREIGN KEY'?'DROP FOREIGN KEY':'DROP CHECK');
    }
   }
   await runner.query(statement)}catch(e){if(!isIgnorable(e))throw e}},
 };
}

async function ensureDatabaseExists({host,port,user,password,database,ssl}){
 const admin=await mysql.createConnection({host,port,user,password,ssl});
 try{await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)}
 finally{await admin.end()}
}

export async function dropDatabase({database}={}){
 if(!database||!/^hadhri_test_[a-zA-Z0-9_]+$/.test(database))throw new Error('Suppression réservée aux bases de test hadhri_test_.');
 const url=new URL(process.env.DATABASE_URL);
 const admin=await mysql.createConnection({host:url.hostname,port:url.port||3306,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password)});
 try{await admin.query(`DROP DATABASE IF EXISTS \`${database||url.pathname.slice(1)}\``)}
 finally{await admin.end()}
}

export async function connectDatabase({database}={}){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL est requis (ex: mysql://root:@127.0.0.1:3306/hadhri) — installez/démarrez MySQL (XAMPP) au préalable.');
 const url=new URL(process.env.DATABASE_URL);
 if(url.protocol!=='mysql:')throw new Error('DATABASE_URL doit utiliser mysql://. Les données PostgreSQL doivent être migrées séparément.');
 const dbName=database||decodeURIComponent(url.pathname.slice(1));
 if(!/^[a-zA-Z0-9_]+$/.test(dbName))throw new Error('Nom de base MySQL invalide.');
 const config={host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:dbName,timezone:'Z',connectTimeout:10000};
 // An empty CA file (VPS without a custom certificate) falls back to the system trust store.
 const sslCa=process.env.DATABASE_SSL_CA||(process.env.DATABASE_SSL_CA_FILE?(await readFile(process.env.DATABASE_SSL_CA_FILE,'utf8').catch(()=>'')).trim():'');
 if(process.env.DATABASE_SSL==='true'||url.searchParams.get('ssl-mode')==='REQUIRED')config.ssl={rejectUnauthorized:true,...(sslCa?{ca:sslCa}:{})};
 if(process.env.DATABASE_AUTO_CREATE!=='false')await ensureDatabaseExists(config);
 const pool=mysql.createPool({...config,charset:'utf8mb4_unicode_ci',dateStrings:false});
 pool.on('connection',connection=>{connection.query("SET time_zone = '+00:00'",error=>{if(error)connection.destroy()})});
 const db={
  ...wrapConnection(pool),
  close:()=>pool.end(),
  transaction:async fn=>{
   const connection=await pool.getConnection();
   try{
    await connection.beginTransaction();
    const value=await fn(wrapConnection(connection));
    await connection.commit();
    return value;
   }catch(e){await connection.rollback();throw e}
   finally{connection.release()}
  },
 };
 try{await db.exec(await readFile(new URL('./migrations/001_catalog.sql',import.meta.url),'utf8'));return db}catch(e){await pool.end();throw e}
}
