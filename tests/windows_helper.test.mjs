// SPDX-License-Identifier: Apache-2.0
// Windows 实测（rc.10.1／10.2）挂过的几处，在任何系统上都能测的那部分：PowerShell 等多久、冷启动的进度记录不算出错、失败原因能带出来、按目标系统拼浏览器路径。
import test from 'node:test';
import assert from 'node:assert/strict';
import { psTimeout, realStderr, reasonOf } from '../scripts/private_files.mjs';
import { browserCandidates } from '../scripts/make_pdf.mjs';

test('PowerShell 默认等 120 秒，环境变量可改，乱填回默认', () => {
  const old = process.env.XUANJI_POWERSHELL_TIMEOUT_MS;
  try {
    delete process.env.XUANJI_POWERSHELL_TIMEOUT_MS; assert.equal(psTimeout(), 120000);
    process.env.XUANJI_POWERSHELL_TIMEOUT_MS = '30000'; assert.equal(psTimeout(), 30000);
    for (const v of ['abc', '0', '-5', '999999999', '1.5']) { process.env.XUANJI_POWERSHELL_TIMEOUT_MS = v; assert.equal(psTimeout(), 120000); }
  } finally { if (old === undefined) delete process.env.XUANJI_POWERSHELL_TIMEOUT_MS; else process.env.XUANJI_POWERSHELL_TIMEOUT_MS = old; }
});

test('冷启动的 CLIXML 进度记录不算出错，错误记录照样算', () => {
  const progress = '#< CLIXML\r\n<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04"><Obj S="progress" RefId="0"><TN RefId="0"><T>System.Management.Automation.PSCustomObject</T></TN><MS><I64 N="SourceId">1</I64><PR N="Record"><AV>Preparing modules for first use.</AV></PR></MS></Obj></Objs>';
  assert.equal(realStderr(progress), '');
  assert.equal(realStderr(''), '');
  assert.equal(realStderr('PRIVATE_FILE_INVALID\r\n'), 'PRIVATE_FILE_INVALID');
  const error = '#< CLIXML\r\n<Objs Version="1.1.0.1"><S S="Error">something broke</S></Objs>';
  assert.notEqual(realStderr(error), '');
});

test('失败原因顺着 cause 带出来，没有就是空', () => {
  const inner = Error('PRIVATE_FILE_INVALID', { cause: 'POWERSHELL_TIMEOUT' });
  assert.equal(reasonOf(Error('PRIVATE_CREATE_FAILED', { cause: inner })), 'POWERSHELL_TIMEOUT');
  assert.equal(reasonOf(Error('PRIVATE_CREATE_FAILED', { cause: Error() })), '');
  assert.equal(reasonOf(Error('X')), '');
});

test('浏览器路径按目标系统拼：Linux 用斜杠，Windows 用反斜杠，跟在哪台机器上跑无关', () => {
  assert(browserCandidates({ PATH: '/usr/bin:/snap/bin' }, 'linux').includes('/usr/bin/chromium'));
  assert(browserCandidates({ HOME: '/Users/x' }, 'darwin').includes('/Users/x/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'));
  assert.equal(browserCandidates({ ProgramFiles: 'C:\\Program Files' }, 'win32')[0], 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe');
});

test('Windows 上核私有文件，PDF 那么大的也要核得了：check 跟 create-b64 同一个上限（rc.11 Windows 复测：3.5MB 的 PDF 被 2MB 上限判成不合格）', async () => {
  const { readFile } = await import('node:fs/promises');
  const ps = await readFile(new URL('../scripts/private_windows.ps1', import.meta.url), 'utf8');
  assert.match(ps, /if\(\$Operation -eq 'create-b64' -or \$Operation -eq 'check'\)\{\$limit=33554432\}/);
  const js = await readFile(new URL('../scripts/private_files.mjs', import.meta.url), 'utf8');
  assert.match(js, /windows\('check',path,'',MAX_BYTES\)/);
  assert.match(js, /const MAX_BYTES=32\*1024\*1024;/);
});
