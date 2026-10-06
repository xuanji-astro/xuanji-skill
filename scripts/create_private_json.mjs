// SPDX-License-Identifier: Apache-2.0
import {writePrivateText} from './private_files.mjs';
import {pathToFileURL} from 'node:url';
import {realpathSync} from 'node:fs';
// Creates only the new explicitly selected file; never overwrites or chmods other files.
export async function createPrivateJSON(path,value){
  const text=JSON.stringify(value)+'\n';
  if(Buffer.byteLength(text)>2*1024*1024) throw Error('INPUT_TOO_LARGE');
  await writePrivateText(path,text);
}
export async function createPrivateEmpty(path){
  await writePrivateText(path,'');
}
async function main(){
  if(process.argv.length===4&&process.argv[2]==='--empty'){await createPrivateEmpty(process.argv[3]);console.log('PRIVATE_FILE_CREATED');return;}
  if(process.argv.length!==3)throw Error('CONFIG_INVALID');
  const chunks=[];let bytes=0;
  for await(const c of process.stdin){bytes+=c.length;if(bytes>2*1024*1024)throw Error('INPUT_TOO_LARGE');chunks.push(c);}
  let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('INPUT_INVALID');}
  await createPrivateJSON(process.argv[2],value);console.log('PRIVATE_FILE_CREATED');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(realpathSync(process.argv[1])).href)main().catch(e=>{console.error(['CONFIG_INVALID','INPUT_TOO_LARGE','INPUT_INVALID','PERMISSION_ENVIRONMENT_UNVERIFIED','PRIVATE_CREATE_FAILED'].includes(e.message)?e.message:'PRIVATE_CREATE_FAILED');process.exitCode=1;});
