// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,link,stat,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPrivateJSON,createPrivateEmpty} from '../scripts/create_private_json.mjs';
import {readPrivateJSON,assertPrivateFile,writePrivateText} from '../scripts/private_files.mjs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

test('private request, result, manuscript and HTML share checked creation',async()=>{
  const d=await mkdtemp(join(tmpdir(),'xj-cross-'));
  for(const name of ['request.json','profile.json','report.json','report.html']){
    const p=join(d,name);await writePrivateText(p,'{"synthetic":true}');await assertPrivateFile(p);
    assert.equal((await readPrivateJSON(p)).synthetic,true);
    await assert.rejects(writePrivateText(p,'changed'),/PRIVATE_CREATE_FAILED/);
  }
});
test('empty workflow preserves privacy and check CLI does not print payload',async()=>{
  const d=await mkdtemp(join(tmpdir(),'xj-empty-cross-')),p=join(d,'request.json');
  await createPrivateEmpty(p);await writeFile(p,'{"synthetic":true}');await assertPrivateFile(p);
  const r=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/check_private_file.mjs',import.meta.url)),p],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'PRIVATE_FILE_VERIFIED\n');assert.equal(r.stderr,'');
});
test('POSIX hard-linked input is rejected without touching either path',{skip:process.platform==='win32'},async()=>{
  const d=await mkdtemp(join(tmpdir(),'xj-links-')),p=join(d,'request.json'),q=join(d,'linked.json');
  await createPrivateJSON(p,{synthetic:true});await link(p,q);
  await assert.rejects(readPrivateJSON(p),/PRIVATE_FILE_INVALID/);
  await assert.rejects(readPrivateJSON(q),/PRIVATE_FILE_INVALID/);
  assert.equal((await stat(p)).nlink,2);
});
test('POSIX unsafe in-place editor permission change stops reads; no repair',{skip:process.platform==='win32'},async()=>{
  const d=await mkdtemp(join(tmpdir(),'xj-editor-')),p=join(d,'request.json');
  await createPrivateJSON(p,{synthetic:true});await chmod(p,0o644);
  await assert.rejects(readPrivateJSON(p),/PRIVATE_FILE_INVALID/);assert.equal((await stat(p)).mode&0o777,0o644);
});
test('feedback renderer preserves original, exact target and uses text-safe DOM',async()=>{
  const t=await readFile(new URL('../template/single-brand.html',import.meta.url),'utf8');
  const fn=t.match(/function personaFeedback\(target,original\) \{[\s\S]*?\n\}/)[0];
  const original='<img src=x onerror=evil()>合成服务器原句';
  const feedback=[{target:'base',statement:original,feedback:'不准'}];
  const render=vm.runInNewContext(fn+';personaFeedback',{R:{persona_feedback:feedback},h:(tag,cls,text)=>({tag,cls,text})});
  assert.equal(render('base',original).text,'你说这句不像你');
  assert.equal(render('rebirth0',original),null);assert.equal(render('base','其他句'),null);
  assert.equal(feedback[0].statement,original);
  feedback[0].feedback='部分准';assert.equal(render('base',original).text,'你说这句部分像你');
});
test('Windows unsafe ACL is rejected, not repaired',{skip:process.platform!=='win32'},async()=>{
  const d=await mkdtemp(join(tmpdir(),'xj-acl-')),p=join(d,'request.json');
  await createPrivateJSON(p,{synthetic:true});await assertPrivateFile(p);
  const r=spawnSync('icacls.exe',[p,'/grant','*S-1-1-0:(R)'],{encoding:'utf8'});
  assert.equal(r.status,0);
  await assert.rejects(readPrivateJSON(p),/PRIVATE_FILE_INVALID/);
  await assert.rejects(assertPrivateFile(p),/PRIVATE_FILE_INVALID/);
});
