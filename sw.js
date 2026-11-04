/* 부적합 처리 — 통합 화면(공통 머리글) 서비스 워커
 * - 통합 화면 파일(index.html 등)만 다룸: 인터넷 먼저, 끊겼을 때만 저장본
 * - mfg/ 아래(제조팀 화면)는 mfg/sw.js 가 따로 다룸 → 여기서는 손대지 않음
 * - 다른 팀 사이트(/Ninebell_Defect-Data-Upload/, /Ninebell_Defect-Purchase/)·구글시트·서버 요청도 손대지 않음
 */
const CACHE = 'nb-shell-v1';   // 아이콘·로고를 바꾸면 숫자를 올려야 새 그림으로 바뀜
const CORE = ['./', './index.html', './manifest.webmanifest', './ninebell-logo.png', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'];
const BASE = new URL('./', self.location).pathname;   // /Ninebell_Defect-Label/

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // 이전 버전 저장본만 정리 (같은 주소를 쓰는 다른 팀 저장본은 그대로)
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => /^nb-shell-/.test(k) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (!url.pathname.startsWith(BASE) || url.pathname.startsWith(BASE + 'mfg/')) return;
  if (/\.png$/.test(url.pathname)) { e.respondWith(caches.match(req).then(r => r || fetch(req))); return; }
  e.respondWith(
    fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
