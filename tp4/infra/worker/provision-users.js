// Explicit administrative script; credentials come only from the server environment.
import {db,checked} from './shared.js';
const org1='10000000-0000-4000-8000-000000000001',org2='10000000-0000-4000-8000-000000000002';
const password=process.env.DEMO_PASSWORD;
if(!password||password.length<12)throw new Error('Set DEMO_PASSWORD (12+ characters)');
const users=[['productor@agropulse.test','producer',org1],['operador@agropulse.test','operator',org1],['asesor@agropulse.test','advisor',org1],['aislado@agropulse.test','producer',org2]];
/** @type {import('@supabase/supabase-js').User[]} */
const existing=[];
for(let page=1;;page++){
 const {data,error}=await db.auth.admin.listUsers({page,perPage:100});if(error)throw error;
 existing.push(...data.users);if(data.users.length<100)break;
}
for(const [email,role,organization_id] of users){
 let user=existing.find(u=>u.email===email);
 if(!user){const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error;user=data.user;existing.push(user);}
 checked(await db.from('memberships').upsert({user_id:user.id,organization_id,role}));console.log('Provisioned',email,role);
}
// Producer has a second membership to demonstrate RF-03; isolated user cannot see org1.
const producer=existing.find(u=>u.email==='productor@agropulse.test');
if(!producer)throw new Error('Producer was not provisioned');
checked(await db.from('memberships').upsert({user_id:producer.id,organization_id:org2,role:'producer'}));
