// Offline PostgreSQL verification. Never reads .env or contacts Supabase.
// The baseline is explicit because the repo only contains additive migrations.
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2);
const option=name=>args[args.indexOf(name)+1];
if(!args.includes('--baseline')||!args.includes('--pglite'))throw Error('Usage: node server/admin-db-test.mjs --baseline <audited SQL schema> --pglite <PGlite dist/index.js>');
const {PGlite}=await import(pathToFileURL(resolve(option('--pglite'))).href);
const db=new PGlite();
try{
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,aud text,role text,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 grant execute on all functions in schema auth,storage to anon,authenticated;`);
 const baseline=await readFile(resolve(option('--baseline')),'utf8');
 await db.exec(baseline.replace(/create extension if not exists pgcrypto;/i,'-- gen_random_uuid is built in to this offline runtime.'));
 // Model pre-existing Supabase grants before additive migrations revoke them.
 await db.exec('grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;');
 const migrations=new URL('../supabase/migrations/',import.meta.url);
 for(const file of (await readdir(migrations)).filter(x=>x.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,migrations),'utf8'));
 await db.exec("insert into public.restaurants(name,slug,published) values('Offline fictitious demo','cerveceria-demo',false);");
 if(args.includes('--hardening-review'))await db.exec(await readFile(new URL('../supabase/review/admin-hardening-draft.sql',import.meta.url),'utf8'));
 const tests=new URL('../supabase/tests/',import.meta.url);
 for(const file of (await readdir(tests)).filter(x=>x.endsWith('.sql')).sort()){
  const result=await db.exec(await readFile(new URL(file,tests),'utf8'));
  console.log(file,JSON.stringify(result.flatMap(r=>r.rows).filter(r=>r.result)));
 }
 if(args.includes('--security-probe')){
  await db.exec("select set_config('menuia.probe.expected_protected','"+(args.includes('--hardening-review')?'true':'false')+"',false)");
  const result=await db.exec(await readFile(new URL('../supabase/review/promotion-oracle-probe.sql',import.meta.url),'utf8'));
  console.log('Offline security probe',JSON.stringify(result.flatMap(r=>r.rows).filter(r=>r.finding)));
 }
 console.log('Offline SQL suites passed. This does not verify the deployed schema, grants or Supabase Auth.');
}catch(error){console.error('Offline SQL failed:',error.code||'',error.message);process.exitCode=1;}finally{await db.close();}
