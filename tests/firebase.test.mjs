import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFirebaseToken,firebaseConfig} from '../backend/firebase.mjs';

test('Firebase verifier refuses missing configuration, emulator mode and malformed or wrong-project tokens',async()=>{
 const keys=['FIREBASE_PROJECT_ID','FIREBASE_API_KEY','FIREBASE_APP_ID','FIREBASE_AUTH_DOMAIN','FIREBASE_AUTH_EMULATOR_HOST'];
 const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  keys.forEach(key=>delete process.env[key]);
  assert.equal(firebaseConfig(),null);
  await assert.rejects(()=>verifyFirebaseToken('invalid'),error=>error.status===503);
  process.env.FIREBASE_PROJECT_ID='hadhri-verifier-test';
  process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';
  await assert.rejects(()=>verifyFirebaseToken('unsigned'),error=>error.status===503);
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  await assert.rejects(()=>verifyFirebaseToken('invalid'),error=>error.status===401);
  const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const token=encoded({alg:'RS256',kid:'test'})+'.'+encoded({sub:'test',aud:'another-project',iss:'https://securetoken.google.com/another-project',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)})+'.fake';
  await assert.rejects(()=>verifyFirebaseToken(token),error=>error.status===401);
 }finally{for(const key of keys)if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key]}
});
