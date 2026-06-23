/* Last Call Trivia — stats model + sync client (local-first, optional Netlify Blobs backend). */
(function(){
"use strict";
var LCT = window.LCT = window.LCT || {};
var LS = { BASE:'lct_stats_base', PENDING:'lct_stats_pending', CREW:'lct_crew' };
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function load(k,fb){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch(e){ return fb; } }
function setLS(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function normName(n){ return ((n||'').toLowerCase().replace(/[^a-z0-9]+/g,'')) || 'player'; }
function emptyAgg(){ return { v:1, applied:{}, players:{}, updated:0 }; }
function freshPlayer(name){ return { name:name||'Player', games:0,wins:0,losses:0,ties:0,answered:0,correct:0,steals:0,streak:0,bestStreak:0,byCat:{} }; }

/* Apply match records to an aggregate. Idempotent (skips applied match ids).
   This SAME function runs on the server function so client + server agree. */
function applyMatches(base, matches){
  if(!base) base = emptyAgg();
  if(!base.applied) base.applied = {};
  if(!base.players) base.players = {};
  var sorted = (matches||[]).slice().sort(function(a,b){ return (a.ts||0)-(b.ts||0); });
  sorted.forEach(function(m){
    if(!m || !m.id || base.applied[m.id]) return;
    base.applied[m.id] = true;
    (m.players||[]).forEach(function(pl){
      var P = base.players[pl.id] || (base.players[pl.id] = freshPlayer(pl.name));
      if(pl.name) P.name = pl.name;
      P.games++; P.answered += pl.answered||0; P.correct += pl.correct||0; P.steals += pl.steals||0;
      var bc = pl.byCat || {};
      for(var c in bc){ if(!P.byCat[c]) P.byCat[c]={a:0,c:0}; P.byCat[c].a += bc[c].a||0; P.byCat[c].c += bc[c].c||0; }
      if(m.winnerId == null){ P.ties++; }
      else if(m.winnerId === pl.id){ P.wins++; P.streak++; if(P.streak > P.bestStreak) P.bestStreak = P.streak; }
      else { P.losses++; P.streak = 0; }
    });
    if((m.ts||0) > base.updated) base.updated = m.ts;
  });
  return base;
}

var Stats = {
  applyMatches: applyMatches, emptyAgg: emptyAgg, normName: normName,
  endpoint: '/api/stats',
  syncState: 'unknown',          /* 'synced' | 'local' | 'syncing' | 'unknown' */
  crew: load(LS.CREW, 'alex-anthony'),
  base: load(LS.BASE, emptyAgg()),
  pending: load(LS.PENDING, []),
  onChange: null,
  _syncing: false,

  persist: function(){ setLS(LS.BASE, this.base); setLS(LS.PENDING, this.pending); setLS(LS.CREW, this.crew); },
  display: function(){ return applyMatches(clone(this.base), this.pending); },

  setCrew: function(code){
    code = ((code||'').toLowerCase().replace(/[^a-z0-9_-]/g,'')).slice(0,40) || 'crew';
    this.crew = code; this.base = emptyAgg(); this.persist();
    return this.refresh();
  },

  record: function(match){
    match.crew = this.crew;
    this.pending.push(match);
    this.persist();
    if(this.onChange) this.onChange();
    return this.sync();
  },

  sync: function(){
    var self = this;
    if(self._syncing) return Promise.resolve();
    if(!self.pending.length){ return self.refresh(); }
    self._syncing = true; self.syncState = 'syncing'; if(self.onChange) self.onChange();
    return fetch(self.endpoint + '?crew=' + encodeURIComponent(self.crew), {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ matches: self.pending, crew: self.crew })
    }).then(function(r){ if(!r.ok) throw new Error('http'); return r.json(); })
    .then(function(server){
      if(server && server.players){
        self.base = server;
        self.pending = self.pending.filter(function(m){ return !(self.base.applied && self.base.applied[m.id]); });
        self.persist(); self.syncState = 'synced';
      } else { self.syncState = 'local'; }
    }).catch(function(){ self.syncState = 'local'; })
    .then(function(){ self._syncing = false; if(self.onChange) self.onChange(); });
  },

  refresh: function(){
    var self = this;
    return fetch(self.endpoint + '?crew=' + encodeURIComponent(self.crew), {cache:'no-store'})
    .then(function(r){ if(!r.ok) throw new Error('http'); return r.json(); })
    .then(function(server){
      if(server && server.players){ self.base = server; self.persist(); self.syncState = 'synced'; }
      if(self.pending.length){ return self.sync(); }
    }).catch(function(){ self.syncState = 'local'; })
    .then(function(){ if(self.onChange) self.onChange(); });
  }
};
LCT.Stats = Stats;
})();
