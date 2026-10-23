import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { ISOLATED_EVENT_ID, isolatedPerformance, isolatedConfiguration, isolatedMailMode, requireIsolatedAdmin, validateIsolatedRecipient } from "../src/lib/tickets/isolated-test";
import { TicketService, type Database, type MailPayload } from "../src/lib/tickets/service";

test("isolated: authentication, OFF, time window and invalid allowlists fail closed", () => {
  const now = Date.now();
  const env = { TICKET_ISOLATED_ENABLED: "true", TICKET_ISOLATED_START: new Date(now-1000).toISOString(), TICKET_ISOLATED_END: new Date(now+60000).toISOString(), TICKET_ISOLATED_ALLOWLIST: '["tester@example.test"]' };
  assert.throws(()=>requireIsolatedAdmin(null));
  requireIsolatedAdmin("fixture-admin");
  assert.throws(()=>isolatedConfiguration({...env,TICKET_ISOLATED_ENABLED:"false"},now));
  assert.throws(()=>isolatedConfiguration(env,now+60001));
  assert.throws(()=>isolatedConfiguration(env,now-2000));
  for (const list of [undefined,'null','[]','["invalid"]','{}']) assert.throws(()=>validateIsolatedRecipient('tester@example.test',{...env,TICKET_ISOLATED_ALLOWLIST:list},now));
  assert.throws(()=>validateIsolatedRecipient('outsider@example.test',env,now));
  validateIsolatedRecipient('tester@example.test',env,now);
});

test("isolated DB workflow: never public; authenticated gated booking, paused and stopped rejection, both mails restricted", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(await readFile(new URL('../db/tickets.sql',import.meta.url),'utf8'));
    const db: Database = { query: async(sql,args)=>(await pg.query(sql,args)).rows as Record<string,unknown>[], transaction: fn=>pg.transaction(tx=>fn({query:async(sql,args)=>(await tx.query(sql,args)).rows as Record<string,unknown>[]})) };
    const now = Date.now();
    const env: Record<string,string|undefined> = { TICKET_ISOLATED_ENABLED:"true", TICKET_ISOLATED_START:new Date(now-60000).toISOString(), TICKET_ISOLATED_END:new Date(now+600000).toISOString(), TICKET_ISOLATED_ALLOWLIST:'["tester@example.test"]' };
    const source = isolatedPerformance(env);
    const service = new TicketService(db,'tester@example.test',[source],env);
    const config = { eventId:source.id, opens_at:new Date(now-60000).toISOString(), closes_at:new Date(now+600000).toISOString(), enabled:true,max_quantity:1,capacity:3 };
    await service.saveEvent(config,'fixture-admin');
    assert.deepEqual(await service.publicEvents(),[]);
    const input = {eventId:ISOLATED_EVENT_ID,name:'架空テスト',email:'tester@example.test',quantity:1,notes:'',consent:true};
    const submit = (admin?:string)=>service.submit(input,randomUUID(),'fixture-ip',admin);
    await assert.rejects(submit());
    env.TICKET_ISOLATED_ENABLED='false'; await assert.rejects(submit('fixture-admin')); env.TICKET_ISOLATED_ENABLED='true';
    const originalEnd=env.TICKET_ISOLATED_END; env.TICKET_ISOLATED_END=new Date(now-1).toISOString(); await assert.rejects(submit('fixture-admin')); env.TICKET_ISOLATED_END=originalEnd;
    await service.saveEvent({...config,enabled:false,version:1},'fixture-admin',source.id); await assert.rejects(submit('fixture-admin'));
    await service.saveEvent({...config,version:2},'fixture-admin',source.id);
    const result=await submit('fixture-admin'); assert.ok(result.receipt);
    const sent:MailPayload[]=[]; await service.deliver(result.id,async mail=>{sent.push(mail)});
    assert.equal(sent.length,2); assert.ok(sent.every(mail=>mail.to==='tester@example.test' && mail.isolatedEventId===ISOLATED_EVENT_ID));
    await db.query("UPDATE ticket_mail_jobs SET state='failed' WHERE reservation_id=$1",[result.id]);
    let forbiddenSends=0;
    env.TICKET_ISOLATED_ALLOWLIST='["other@example.test"]'; await service.deliver(result.id,async()=>{forbiddenSends++},'fixture-admin');
    assert.equal(forbiddenSends,0);
    delete env.TICKET_ISOLATED_ALLOWLIST; await service.deliver(result.id,async()=>{forbiddenSends++},'fixture-admin');
    assert.equal(forbiddenSends,0);
    const jobs=await db.query('SELECT state FROM ticket_mail_jobs WHERE reservation_id=$1',[result.id]); assert.ok(jobs.every(j=>j.state==='failed'));
    env.TICKET_ISOLATED_ENABLED='false'; await assert.rejects(submit('fixture-admin'));
    assert.equal((await db.query('SELECT count(*)::int n FROM ticket_reservations'))[0].n,1);
  } finally {await pg.close()}
});

test("isolated route boundary: page and API require server auth; no public catalogue or sitemap entry", async()=>{
  const page=await readFile(new URL('../src/app/admin/test-reservation/page.tsx',import.meta.url),'utf8');
  assert.match(page,/if \(!await currentAdmin\(\)\) notFound\(\)/);
  const route=await readFile(new URL('../src/app/api/tickets/[...path]/route.ts',import.meta.url),'utf8');
  assert.ok(route.indexOf('requireIsolatedAdmin(isolatedAdmin)')<route.indexOf('action === "isolated/events"'));
  assert.match(route,/!isolated && v.eventId === ISOLATED_EVENT_ID/);
  for (const file of ['../src/lib/site-data.ts','../src/app/sitemap.ts']) assert.ok(!(await readFile(new URL(file,import.meta.url),'utf8')).includes(ISOLATED_EVENT_ID));
});

test("isolated SMTP: Preview always simulates, production OFF by default; every recipient revalidated",()=>{
  const now=Date.now(); const env={TICKET_ISOLATED_ENABLED:"true",TICKET_ISOLATED_START:new Date(now-1000).toISOString(),TICKET_ISOLATED_END:new Date(now+60000).toISOString(),TICKET_ISOLATED_ALLOWLIST:'["tester@example.test"]'};
  assert.equal(isolatedMailMode('tester@example.test',{...env,VERCEL_ENV:"preview",TICKET_ISOLATED_SMTP_ENABLED:"true"}),"simulate");
  assert.throws(()=>isolatedMailMode('tester@example.test',{...env,VERCEL_ENV:"production"}));
  assert.equal(isolatedMailMode('tester@example.test',{...env,VERCEL_ENV:"production",TICKET_ISOLATED_SMTP_ENABLED:"true"}),"smtp");
  assert.throws(()=>isolatedMailMode('outsider@example.test',{...env,VERCEL_ENV:"preview"}));
});
