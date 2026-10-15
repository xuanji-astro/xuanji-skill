// 报告 PDF（10-14）：用户电脑上有 Chrome／Edge／Chromium／Brave，就在后台把画好的报告打印成 PDF，跟 HTML 一起交。
// 没有浏览器、打出来缺中文字体、页数不对，都不交 PDF（HTML 本身是完整的，用户用浏览器打开也能自己存）。
// 打印用的那份副本和浏览器的临时配置放在系统临时目录里只有本人能进的文件夹，打完就删；不联网（报告页的 CSP 不许任何外部请求）。
// Copyright 2026 杭州强势播传文化影视传媒有限公司
// SPDX-License-Identifier: Apache-2.0
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix as P, win32 as W } from 'node:path';
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { readPrivateText, writePrivateBytes, reasonOf } from './private_files.mjs';

export function browserCandidates(env = process.env, platform = process.platform) {
  const c = [], join = platform === 'win32' ? W.join : P.join;   // 按目标系统拼路径：在 Windows 上跑 Linux 分支的测试也该拼出 /usr/bin/chromium（10-15 Windows 实测挂过）
  if (platform === 'win32') {
    for (const base of [env['ProgramFiles(x86)'], env.ProgramFiles, env.LOCALAPPDATA].filter(Boolean)) {
      c.push(join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'), join(base, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'));
    }
  } else if (platform === 'darwin') {
    for (const app of ['Google Chrome.app/Contents/MacOS/Google Chrome', 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge', 'Chromium.app/Contents/MacOS/Chromium', 'Brave Browser.app/Contents/MacOS/Brave Browser']) {
      c.push('/Applications/' + app); if (env.HOME) c.push(join(env.HOME, 'Applications', app));
    }
  } else {
    for (const d of String(env.PATH || '').split(':').filter(Boolean)) for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable', 'brave-browser']) c.push(join(d, n));
  }
  return c;
}
export function findBrowser(env = process.env, platform = process.platform) {
  return browserCandidates(env, platform).find((p) => { try { return existsSync(p); } catch { return false; } }) || null;
}

// 打出来的 PDF 要像样：PDF 文件头、页数够、嵌了能显示中文的字体（没有中文字体的机器会打出一页页方块）
const CJK_FONT = /(Song|Hei|Kai|Fang|Ming|PingFang|Hiragino|NotoSansCJK|NotoSerifCJK|Noto(Sans|Serif)(SC|TC|HK|JP|KR)|SourceHan|YaHei|SimSun|SimHei|DengXian|WenQuanYi|WQY|DroidSansFallback|Lantinghei|Yuanti|JhengHei|MingLiU|UKai|UMing|AR-?PL|Gothic|Meiryo)/i;
export function checkPDF(buf, { minPages = 5 } = {}) {
  if (!Buffer.isBuffer(buf) || buf.length < 20000 || buf.subarray(0, 5).toString('latin1') !== '%PDF-') return 'FAILED';
  const s = buf.toString('latin1');
  const pages = (s.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
  if (pages < minPages) return 'FAILED';
  const fonts = [...s.matchAll(/\/(?:BaseFont|FontName)\s*\/([A-Za-z0-9+_.\-]+)/g)].map((m) => m[1]);
  if (!fonts.some((f) => CJK_FONT.test(f))) return 'FONT';
  return null;
}

function run(exe, args, timeout) {
  return new Promise((ok) => {
    let child; try { child = spawn(exe, args, { shell: false, windowsHide: true, stdio: 'ignore' }); } catch { ok(false); return; }
    const t = setTimeout(() => { try { child.kill(); } catch {} ok(false); }, timeout);
    child.on('error', () => { clearTimeout(t); ok(false); });
    child.on('close', (code) => { clearTimeout(t); ok(code === 0); });
  });
}

// html＝已经画好的静态报告。返回 'SAVED' | 'NO_BROWSER' | 'FONT' | 'FAILED'；只有 SAVED 才在 outPath 新建文件
export async function printPDF(html, outPath, { browser = findBrowser(), timeout = 120000, minPages } = {}) {
  if (!browser) return 'NO_BROWSER';
  const work = await mkdtemp(join(tmpdir(), 'xuanji-pdf-'));
  try {
    // 打印前把折叠全展开（跟页面上「存为 PDF」按钮一样），去掉按钮那段小脚本
    const printable = html.replace(/<details(?![^>]*\sopen)/g, '<details open').replace(/<script>\(function\(\)\{var shut=null;[\s\S]*?<\/script>\n/, '');
    const page = join(work, 'report.html'), pdf = join(work, 'report.pdf');
    await writeFile(page, printable, { mode: 0o600, flag: 'wx' });
    const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
      '--disable-background-networking', '--disable-component-update', '--no-pdf-header-footer', '--user-data-dir=' + join(work, 'profile'), '--print-to-pdf=' + pdf];
    if (process.platform === 'linux' && process.getuid && process.getuid() === 0) args.push('--no-sandbox');   // 云端容器常以 root 跑，Chromium 不加这个起不来
    if (!(await run(browser, [...args, pathToFileURL(page).href], timeout))) return 'FAILED';
    let buf; try { buf = await readFile(pdf); } catch { return 'FAILED'; }
    const bad = checkPDF(buf, minPages ? { minPages } : undefined);
    if (bad) return bad;
    await writePrivateBytes(outPath, buf);
    return 'SAVED';
  } finally { await rm(work, { recursive: true, force: true }).catch(() => {}); }
}

// 单独补出 PDF：node make_pdf.mjs --html report.html --out report.pdf
// 给在沙箱里跑命令的宿主用（Codex 的沙箱会把浏览器掐掉，build_report 那一步只能出 HTML）：请用户批准这一条在沙箱外跑
export async function main(args) {
  const f = {};
  for (let i = 0; i < args.length; i += 2) { const k = args[i], v = args[i + 1]; if (!['--html', '--out'].includes(k) || !v || v.startsWith('--') || f[k]) throw Error('PDF_CONFIG_INVALID'); f[k] = v; }
  if (!f['--html'] || !f['--out'] || !/\.pdf$/i.test(f['--out'])) throw Error('PDF_CONFIG_INVALID');
  if (existsSync(f['--out'])) throw Error('OUTPUT_EXISTS');
  const html = await readPrivateText(f["--html"], 2 * 1024 * 1024);
  if (!html.includes('<main class="wrap" id="app">') || html.includes('id="xj-data"')) throw Error('PDF_CONFIG_INVALID');   // 只认 build_report 画好的成品
  const r = await printPDF(html, f['--out']);
  console.log(r === 'SAVED' ? 'PDF_SAVED' : 'PDF_SKIPPED_' + r);
  if (r !== 'SAVED') process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main(process.argv.slice(2)).catch((e) => {
  console.error(['PDF_CONFIG_INVALID', 'OUTPUT_EXISTS', 'PRIVATE_FILE_INVALID'].includes(e.message) ? e.message : 'PDF_FAILED'); const w = reasonOf(e); if (w) console.error('WINDOWS_REASON ' + w); process.exitCode = 1;
});
