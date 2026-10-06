// SPDX-License-Identifier: Apache-2.0
import {open,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
const MAX=2*1024*1024;
const posix=()=>['darwin','linux'].includes(process.platform);
function owned(st){if(!st.isFile()||st.nlink!==1||st.uid!==process.getuid()||(st.mode&0o777)!==0o600)throw Error();}
// Built-in Windows PowerShell 5.1. No shell, policy bypass, argv payload or ACL repair.
function windows(operation,path,text='',maxBytes=MAX){
  if(!process.env.SystemRoot)throw Error('PERMISSION_ENVIRONMENT_UNVERIFIED');
  return new Promise((accept,reject)=>{
    const exe=join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
    const helper=fileURLToPath(new URL('./private_windows.ps1',import.meta.url));
    const child=spawn(exe,['-NoLogo','-NoProfile','-NonInteractive','-File',helper,operation,resolve(path),String(maxBytes)],{shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    let bytes=0,out=[],bad=false;
    const timer=setTimeout(()=>{bad=true;child.kill();},15000);
    child.stdout.on('data',c=>{bytes+=c.length;if(bytes>maxBytes+64){bad=true;child.kill();}else out.push(c);});
    child.stderr.on('data',()=>{bad=true;});
    child.on('error',()=>{clearTimeout(timer);reject(Error('PRIVATE_FILE_INVALID'));});
    child.stdin.on('error',()=>{bad=true;});
    child.on('close',code=>{clearTimeout(timer);if(code!==0||bad)reject(Error('PRIVATE_FILE_INVALID'));else accept(Buffer.concat(out).toString('utf8').replace(/^\uFEFF/,''));});
    child.stdin.end(text,'utf8');
  });
}
export async function assertPrivateFile(path){
  try{const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1)throw Error();if(process.platform==='win32'){await windows('check',path);return;}if(!posix())throw Error();owned(st);}catch{throw Error('PRIVATE_FILE_INVALID');}
}
export async function readPrivateJSON(path,maxBytes=8192){
  const text=await readPrivateText(path,maxBytes);
  try{return JSON.parse(text);}catch{throw Error('PRIVATE_FILE_INVALID');}
}
// 读本人私有的文本文件（报告 HTML 自查用）：跟 readPrivateJSON 同样的检查，只是不解析
export async function readPrivateText(path,maxBytes=8192){
  let f;
  try{
    if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>MAX)throw Error();
    if(process.platform==='win32'){const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1)throw Error();return await windows('read',path,'',maxBytes);}
    if(!posix())throw Error();
    const s=await lstat(path);if(s.isSymbolicLink())throw Error();owned(s);
    f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);
    const actual=await f.stat();owned(actual);if(actual.size>maxBytes||actual.dev!==s.dev||actual.ino!==s.ino)throw Error();
    const text=await f.readFile('utf8');if(Buffer.byteLength(text)>maxBytes)throw Error();return text;
  }catch{throw Error('PRIVATE_FILE_INVALID');}finally{await f?.close();}
}
// Only the new named file is created: no overwrite, chmod or recursive changes.
export async function writePrivateText(path,text){
  if(typeof text!=='string'||Buffer.byteLength(text)>MAX)throw Error('INPUT_TOO_LARGE');
  if(!posix()&&process.platform!=='win32')throw Error('PERMISSION_ENVIRONMENT_UNVERIFIED');
  let f;
  try{
    if(process.platform==='win32'){await windows('create',path,text);return;}
    f=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
    owned(await f.stat());await f.writeFile(text,'utf8');await f.sync();owned(await f.stat());
  }catch{throw Error('PRIVATE_CREATE_FAILED');}finally{await f?.close();}
}
