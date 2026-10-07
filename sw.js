/* 부적합 처리 요청 — 앱 설치용 저장 스크립트
 * - 화면(index.html): 인터넷에서 새로 받음 (GitHub에 올린 수정이 바로 반영). 4초 넘게 걸리면 저장된 화면을 먼저 보여 주고 새 화면은 다음에 씀
 * - 인식 도구(jsdelivr, 버전이 주소에 박혀 있음): 한 번 받으면 휴대폰에 저장해서 씀
 * - 구글시트·학습 기록: 저장하지 않음 → 항상 실시간
 * 인식 도구 버전을 바꾸면 아래 VERSION 숫자를 올려 주세요.
 */
const VERSION = 'v2';   // v2: 아이콘을 NB+M으로 교체 (2026-10-07)
const APP = 'dl-app-' + VERSION, LIB = 'dl-lib-' + VERSION;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== APP && k !== LIB).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'cdn.jsdelivr.net') { e.respondWith(libFirst(req)); return; }
  if (url.origin !== location.origin) return;                // 구글시트·학습 기록 등은 손대지 않음 (실시간)
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) { e.respondWith(pageFirst(req)); return; }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});

// 인식 도구: 저장된 것 먼저, 없으면 받아서 저장
async function libFirst(req){
  const c = await caches.open(LIB), hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
}
// 화면: 새로 받기. 느리거나 끊겼으면 저장된 화면
async function pageFirst(req){
  const c = await caches.open(APP);
  const net = fetch(req, { cache: 'no-cache' }).then(res => { if (res.ok) c.put('./index.html', res.clone()); return res; });
  net.catch(() => {});
  const saved = await c.match('./index.html');
  if (!saved) return net;
  const slow = new Promise(r => setTimeout(() => r(null), 4000));
  try { return (await Promise.race([net, slow])) || saved; } catch (e) { return saved; }
}
