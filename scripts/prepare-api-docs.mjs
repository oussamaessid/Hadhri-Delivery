import {copyFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const folder=path.dirname(require.resolve('swagger-ui-dist/package.json'));
await mkdir('public/swagger',{recursive:true});
for(const name of ['swagger-ui.css','swagger-ui-bundle.js','swagger-ui-standalone-preset.js','LICENSE','NOTICE']){
 await copyFile(path.join(folder,name),path.join('public/swagger',name));
}
await copyFile('api/openapi.json','public/openapi.json');
console.log('Swagger UI et contrat OpenAPI copiés.');
