import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,stat,readFile,symlink,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPrivateJSON,createPrivateEmpty} from '../scripts/create_private_json.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {assertPrivateFile} from '../scripts/private_files.mjs';
test('actual stdin CLI creates request and manuscript privately without argv data',async()=>{
 const d=await mkdtemp(join(tmpdir(),'xj-stdin-'));
 const script=fileURLToPath(new URL('../scripts/create_private_json.mjs',import.meta.url));
 for(const name of ['request.json','report.json']){
  const p=join(d,name);const r=spawnSync(process.execPath,[script,p],{input:JSON.stringify({synthetic:true}),encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'PRIVATE_FILE_CREATED\n');await assertPrivateFile(p);
 }
});
test('private creation is 600 at creation and preserves existing files',async()=>{
 const d=await mkdtemp(join(tmpdir(),'xj-create-'));const p=join(d,'request.json');
 await createPrivateJSON(p,{synthetic:true});await assertPrivateFile(p);
 await assert.rejects(createPrivateJSON(p,{}),/PRIVATE_CREATE_FAILED/);
 assert.equal(JSON.parse(await readFile(p,'utf8')).synthetic,true);
 const other=join(d,'other.json');await writeFile(other,'{}',{mode:0o644});
 if(process.platform!=='win32'){await symlink(other,join(d,'link.json'));await assert.rejects(createPrivateJSON(join(d,'link.json'),{}),/PRIVATE_CREATE_FAILED/);assert.equal((await stat(other)).mode&0o777,0o644);}
});

test('--empty keeps 600 through in-place writing, rejects overwrite and symlink',async()=>{
 const d=await mkdtemp(join(tmpdir(),'xj-empty-'));const p=join(d,'request.json');
 const script=fileURLToPath(new URL('../scripts/create_private_json.mjs',import.meta.url));
 const r=spawnSync(process.execPath,[script,'--empty',p],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);await assertPrivateFile(p);assert.equal((await stat(p)).size,0);
 await writeFile(p,JSON.stringify({synthetic:true}));await assertPrivateFile(p);
 await assert.rejects(createPrivateEmpty(p),/PRIVATE_CREATE_FAILED/);
 if(process.platform!=='win32'){const link=join(d,'link.json');await symlink(p,link);await assert.rejects(createPrivateEmpty(link),/PRIVATE_CREATE_FAILED/);}
 assert.equal(JSON.parse(await readFile(p,'utf8')).synthetic,true);
});
