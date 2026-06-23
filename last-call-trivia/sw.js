/* Last Call Trivia service worker — offline app shell. */
var CACHE='lct-v1';
var SHELL=['./','./index.html','./styles.css','./questions.js','./stats.js','./game.js','./ui.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',function(e){ e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}).then(function(){return self.skipWaiting();})); });
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return k!==CACHE?caches.delete(k):null;}));}).then(function(){return self.clients.claim();})); });
self.addEventListener('fetch',function(e){
  var req=e.request; var url=new URL(req.url);
  if(req.method!=='GET') return;                         /* POST sync -> network */
  if(url.origin!==location.origin) return;               /* trivia APIs -> network */
  if(url.pathname.indexOf('/api/')===0) return;          /* stats endpoint -> network */
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        var copy=res.clone(); caches.open(CACHE).then(function(c){c.put(req,copy);}); return res;
      }).catch(function(){ return caches.match('./index.html'); });
    })
  );
});
