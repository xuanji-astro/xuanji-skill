// SPDX-License-Identifier: Apache-2.0
import {assertPrivateFile} from './private_files.mjs';
if(process.argv.length!==3){console.error('CONFIG_INVALID');process.exitCode=1;}
else try{await assertPrivateFile(process.argv[2]);console.log('PRIVATE_FILE_VERIFIED');}catch{console.error('PRIVATE_FILE_INVALID');process.exitCode=1;}
