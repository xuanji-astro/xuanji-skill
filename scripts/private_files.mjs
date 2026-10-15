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
// Windows 实测（rc.10.1／10.2，10-15）：PowerShell 冷启动要 60 秒左右，原来只等 15 秒就判失败，文件其实随后落了盘；
// 冷启动还会往标准错误写一段「#< CLIXML」进度记录（Preparing modules for first use），不算出错。等待默认 120 秒，XUANJI_POWERSHELL_TIMEOUT_MS 可改。
// 失败原因放在 cause 里（POWERSHELL_TIMEOUT／POWERSHELL_EXIT_n／POWERSHELL_STDERR），命令行多打一行 WINDOWS_REASON，不带文件内容。
export const psTimeout=()=>{const n=Number(process.env.XUANJI_POWERSHELL_TIMEOUT_MS);return Number.isInteger(n)&&n>=1000&&n<=600000?n:120000;};
export const realStderr=(s)=>s.replace(/#< CLIXML\s*/g,'').replace(/<Objs\b[\s\S]*?<\/Objs>/g,(m)=>/S="(Error|Warning)"/.test(m)?m:'').trim();
export function reasonOf(e){for(let x=e,i=0;x&&i<5;x=x.cause,i++)if(typeof x.cause==='string')return x.cause;return '';}
function windows(operation,path,text='',maxBytes=MAX){
  if(!process.env.SystemRoot)throw Error('PERMISSION_ENVIRONMENT_UNVERIFIED');
  return new Promise((accept,reject)=>{
    const exe=join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
    const helper=fileURLToPath(new URL('./private_windows.ps1',import.meta.url));
    const child=spawn(exe,['-NoLogo','-NoProfile','-NonInteractive','-File',helper,operation,resolve(path),String(maxBytes)],{shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    let bytes=0,out=[],err=[],errBytes=0,why='';
    const timer=setTimeout(()=>{why='POWERSHELL_TIMEOUT';child.kill();},psTimeout());
    child.stdout.on('data',c=>{bytes+=c.length;if(bytes>maxBytes+64){why=why||'POWERSHELL_OUTPUT_TOO_LARGE';child.kill();}else out.push(c);});
    child.stderr.on('data',c=>{errBytes+=c.length;if(errBytes<=65536)err.push(c);});
    child.on('error',()=>{clearTimeout(timer);reject(Error('PRIVATE_FILE_INVALID',{cause:'POWERSHELL_SPAWN_FAILED'}));});
    child.stdin.on('error',()=>{why=why||'POWERSHELL_STDIN_FAILED';});
    child.on('close',code=>{clearTimeout(timer);
      const e2=realStderr(Buffer.concat(err).toString('utf8'));
      if(!why&&code!==0)why='POWERSHELL_EXIT_'+code;
      if(!why&&e2)why='POWERSHELL_STDERR '+e2.replace(/\s+/g,' ').slice(0,160);
      if(why)reject(Error('PRIVATE_FILE_INVALID',{cause:why}));else accept(Buffer.concat(out).toString('utf8').replace(/^\uFEFF/,''));});
    child.stdin.end(text,'utf8');
  });
}
export async function assertPrivateFile(path){
  try{const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1)throw Error();if(process.platform==='win32'){await windows('check',path,'',MAX_BYTES);return;}if(!posix())throw Error();owned(st);}catch(e){throw Error('PRIVATE_FILE_INVALID',{cause:e});}
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
  }catch(e){throw Error('PRIVATE_FILE_INVALID',{cause:e});}finally{await f?.close();}
}
// 二进制（报告 PDF，10-14）：跟 writePrivateText 一样只新建、只给本人读写，上限 32MB；Windows 走同一个 PowerShell 助手的 create-b64
const MAX_BYTES=32*1024*1024;
export async function writePrivateBytes(path,buf){
  if(!Buffer.isBuffer(buf)||buf.length>MAX_BYTES)throw Error('INPUT_TOO_LARGE');
  if(!posix()&&process.platform!=='win32')throw Error('PERMISSION_ENVIRONMENT_UNVERIFIED');
  let f;
  try{
    if(process.platform==='win32'){await windows('create-b64',path,buf.toString('base64'),MAX_BYTES);return;}
    f=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
    owned(await f.stat());await f.writeFile(buf);await f.sync();owned(await f.stat());
  }catch(e){throw Error('PRIVATE_CREATE_FAILED',{cause:e});}finally{await f?.close();}
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
  }catch(e){throw Error('PRIVATE_CREATE_FAILED',{cause:e});}finally{await f?.close();}
}
