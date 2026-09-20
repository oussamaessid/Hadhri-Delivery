import {spawn} from 'node:child_process';
const processes=[spawn(process.execPath,['--env-file-if-exists=.env','backend/server.mjs'],{stdio:'inherit'}),spawn(process.execPath,['scripts/run-framework.mjs','dev'],{stdio:'inherit'})];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of processes)child.kill('SIGTERM');process.exitCode=code}
for(const child of processes)child.on('exit',code=>stop(code||0));
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
