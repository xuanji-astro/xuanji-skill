#!/usr/bin/env node
// 对过的事：用户在对话里对上了（答「准」「部分准」）的那一条，记进本次工作目录的 hits.json，下一份报告里那一条打上勾
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
// 用法：node hits.mjs add hits.json   （从标准输入给一条 {"id":"h-2016","statement":"报告里那一条说的事","said":"他在对话里怎么说的"}）
// 没有 hits.json 就私有新建；有就读进来，同一个 id 换成新的，别的照旧，写成新文件再换上去（不改别的文件的权限）
import { existsSync, realpathSync } from 'node:fs';
import { rename, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readPrivateJSON, writePrivateText, reasonOf } from './private_files.mjs';
import { createPrivateJSON } from './create_private_json.mjs';

export const SCHEMA = 'xuanji.hits/0.1';
const MAX_ITEMS = 200;
const len = (s) => [...String(s ?? '')].length;
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function hitItem(v, at = today()) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('HIT_INVALID');
  const { id, statement, said } = v;
  if (Object.keys(v).some((k) => !['id', 'statement', 'said'].includes(k))) throw Error('HIT_INVALID');
  if (typeof id !== 'string' || !/^[a-z0-9-]{1,32}$/.test(id)) throw Error('HIT_INVALID');
  if (typeof statement !== 'string' || !statement.trim() || len(statement) > 80) throw Error('HIT_INVALID');
  if (typeof said !== 'string' || !said.trim() || len(said) > 200) throw Error('HIT_INVALID');
  return { id, statement: statement.trim(), said: said.trim(), at };
}

export function addHit(doc, item) {
  if (doc == null) return { schema: SCHEMA, items: [item] };
  if (!doc || doc.schema !== SCHEMA || !Array.isArray(doc.items)) throw Error('HITS_FILE_INVALID');
  const items = doc.items.filter((h) => h && h.id !== item.id);
  if (items.length >= MAX_ITEMS) throw Error('HITS_FULL');
  return { schema: SCHEMA, items: [...items, item] };
}

export async function main(args) {
  if (args.length !== 2 || args[0] !== 'add' || !/\.json$/i.test(args[1])) throw Error('CONFIG_INVALID');
  const path = args[1], chunks = []; let bytes = 0;
  for await (const c of process.stdin) { bytes += c.length; if (bytes > 8192) throw Error('HIT_INVALID'); chunks.push(c); }
  let v; try { v = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Error('HIT_INVALID'); }
  const item = hitItem(v);
  if (!existsSync(path)) { await createPrivateJSON(path, addHit(null, item)); console.log('HITS_SAVED'); return; }
  const next = addHit(await readPrivateJSON(path, 262144), item);
  const tmp = `${path}.${process.pid}.new`;
  await writePrivateText(tmp, JSON.stringify(next) + '\n');
  try { await rename(tmp, path); } catch (e) { await unlink(tmp).catch(() => {}); throw e; }
  console.log('HITS_SAVED');
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2)).catch((e) => {
  const allowed = ['CONFIG_INVALID', 'HIT_INVALID', 'HITS_FILE_INVALID', 'HITS_FULL', 'PRIVATE_FILE_INVALID', 'PERMISSION_ENVIRONMENT_UNVERIFIED'];
  console.error(allowed.includes(e.message) ? e.message : 'HITS_FAILED'); const w = reasonOf(e); if (w) console.error('WINDOWS_REASON ' + w); process.exitCode = 1;
});
