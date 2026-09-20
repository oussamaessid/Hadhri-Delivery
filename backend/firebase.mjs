import {getApps,initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
export function firebaseConfig(){
 const config={apiKey:process.env.FIREBASE_API_KEY,authDomain:process.env.FIREBASE_AUTH_DOMAIN,projectId:process.env.FIREBASE_PROJECT_ID,appId:process.env.FIREBASE_APP_ID};
 return Object.values(config).every(Boolean)?config:null;
}
export async function verifyFirebaseToken(token){
 const projectId=process.env.FIREBASE_PROJECT_ID;
 if(!projectId)throw Object.assign(new Error('La connexion Firebase est en cours de configuration.'),{status:503});
 // Never accept the unsigned emulator tokens on this application server.
 if(process.env.FIREBASE_AUTH_EMULATOR_HOST)throw Object.assign(new Error('Configuration Firebase non autorisée.'),{status:503});
 const name='hadhri-'+projectId;
 const app=getApps().find(app=>app.name===name)||initializeApp({projectId,...(process.env.GOOGLE_APPLICATION_CREDENTIALS?{credential:applicationDefault()}: {})},name);
 try{return await getAuth(app).verifyIdToken(token)}
 catch{throw Object.assign(new Error('Connexion expirée ou invalide. Reconnectez-vous.'),{status:401})}
}
