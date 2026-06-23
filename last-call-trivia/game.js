/* Last Call Trivia — game logic: MC pass & steal, online/offline question feed, persistence. */
(function(){
"use strict";
var LCT = window.LCT = window.LCT || {};
var Stats = LCT.Stats;

var CATS = {
  film:{label:"Film & TV",em:"\u{1F3AC}"}, music:{label:"Music",em:"\u{1F3B5}"}, games:{label:"Video Games",em:"\u{1F3AE}"},
  myth:{label:"Mythology",em:"\u{1F3DB}\u{FE0F}"}, space:{label:"Space",em:"\u{1FA90}"}, tech:{label:"Tech & Web",em:"\u{1F4BB}"},
  sci:{label:"Science",em:"\u{1F52C}"}, hist:{label:"History",em:"\u{1F4DC}"}, geo:{label:"Geography",em:"\u{1F5FA}\u{FE0F}"},
  lit:{label:"Literature",em:"\u{1F4DA}"}, art:{label:"Art",em:"\u{1F3A8}"}, food:{label:"Food & Beer",em:"\u{1F37A}"},
  sport:{label:"Sports",em:"\u{1F3C5}"}, world:{label:"Odd & General",em:"\u{1F9E0}"}
};
var TIERS = {2:{label:"Hard",pts:25,cls:"t2"},3:{label:"Expert",pts:40,cls:"t3"},4:{label:"Fiendish",pts:60,cls:"t4"}};
function pointsFor(d){ return (TIERS[d]||TIERS[3]).pts; }
function stealPts(full){ return Math.round(full/2/5)*5 || Math.round(full/2); }

function hashId(str){ var h=5381,s=(str||'').toLowerCase().replace(/\s+/g,' ').trim(); for(var i=0;i<s.length;i++){ h=((h<<5)+h)+s.charCodeAt(i); h|=0; } return 'q'+(h>>>0).toString(36); }
function decodeHTML(s){ var t=document.createElement('textarea'); t.innerHTML=s; return t.value; }
function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function rand(a){ return a[Math.floor(Math.random()*a.length)]; }
function uuid(){ return 'm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8); }

var BANK = (window.LCT_BANK||[]).map(function(q){ q.id=hashId(q.q); q.src='bank'; return q; });

var LS={GAME:'lct_game',PREFS:'lct_prefs',SEEN:'lct_seen'};
function load(k,fb){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch(e){ return fb; } }
function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

var SEEN = load(LS.SEEN,{});
var PREFS = load(LS.PREFS,{names:["Alex","Anthony"],included:Object.keys(CATS),mode:'auto'});
if(!PREFS.included || !PREFS.included.length) PREFS.included = Object.keys(CATS);
var G = load(LS.GAME,null);
if(G){ if(!G.turnsTaken) G.turnsTaken=[0,0]; if(G.qTarget==null) G.qTarget=0; }

/* ---- online feed ---- */
var feed=[]; var fetching=false; var feedTried=false; var feedOk=false;
var TRIVIA_MAP={film:'film_and_tv',music:'music',lit:'arts_and_literature',art:'arts_and_literature',hist:'history',geo:'geography',sci:'science',space:'science',tech:'science',food:'food_and_drink',sport:'sport_and_leisure',world:'general_knowledge',myth:'society_and_culture',games:'society_and_culture'};
var TRIVIA_REV={film_and_tv:'film',music:'music',arts_and_literature:'lit',history:'hist',geography:'geo',science:'sci',food_and_drink:'food',sport_and_leisure:'sport',general_knowledge:'world',society_and_culture:'world'};
var OTDB_MAP={games:15,myth:20,space:17,tech:18,sci:17,film:11,music:12,hist:23,geo:22,lit:10,art:25,sport:21,world:9,food:9};

function normTrivia(it){ return {c:TRIVIA_REV[it.category]||'world', d:it.difficulty==='hard'?3:2, q:it.question.text, a:it.correctAnswer, w:(it.incorrectAnswers||[]).slice(0,3)}; }
function normOTDB(it,cat){ return {c:cat, d:3, q:decodeHTML(it.question), a:decodeHTML(it.correct_answer), w:(it.incorrect_answers||[]).map(decodeHTML).slice(0,3)}; }
function ingest(items){
  var have={}; BANK.concat(feed).forEach(function(q){ have[q.id]=1; });
  var added=0;
  items.forEach(function(it){
    if(!it.q||!it.a||!it.w||it.w.length<3) return;
    it.id=hashId(it.q); it.src='api';
    if(have[it.id]||SEEN[it.id]) return;
    have[it.id]=1; feed.push(it); added++;
  });
  return added;
}
function fetchTrivia(cats){
  var list=[], seen={};
  cats.forEach(function(c){ var m=TRIVIA_MAP[c]; if(m&&!seen[m]){ seen[m]=1; list.push(m); } });
  var url='https://the-trivia-api.com/v2/questions?limit=50&difficulties=medium,hard'+(list.length?'&categories='+list.join(','):'');
  return fetch(url,{cache:'no-store'}).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(d){ return ingest(d.map(normTrivia)); });
}
function fetchOTDB(cat,n){
  var id=OTDB_MAP[cat]; if(!id) return Promise.resolve(0);
  var url='https://opentdb.com/api.php?amount='+(n||15)+'&category='+id+'&difficulty=hard&type=multiple';
  return fetch(url,{cache:'no-store'}).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(d){ return d.response_code===0 ? ingest(d.results.map(function(x){ return normOTDB(x,cat); })) : 0; });
}
function refillFeed(cats){
  if(fetching) return Promise.resolve(0);
  fetching=true; feedTried=true;
  var otdb=cats.filter(function(c){ return ['games','myth','space','tech'].indexOf(c)>=0; }).slice(0,2);
  return fetchTrivia(cats).then(function(a){ feedOk=true; return a; }).catch(function(){ return 0; })
    .then(function(tot){
      var p=Promise.resolve(tot);
      otdb.forEach(function(c){ p=p.then(function(t){ return fetchOTDB(c).then(function(x){ if(x>0)feedOk=true; return t+x; }).catch(function(){ return t; }); }); });
      return p;
    }).then(function(t){ fetching=false; return t; }, function(){ fetching=false; return 0; });
}

/* ---- pools / mode ---- */
function bankPool(cat){ return BANK.filter(function(q){ return (!cat||q.c===cat) && !SEEN[q.id] && (!G || G.included.indexOf(q.c)>=0); }); }
function feedPool(cat){ return feed.filter(function(q){ return (!cat||q.c===cat) && !SEEN[q.id] && (!G || G.included.indexOf(q.c)>=0); }); }
function isOnline(){ if(PREFS.mode==='offline') return false; if(PREFS.mode==='online') return true; return (typeof navigator==='undefined') || navigator.onLine!==false; }
function modeLabel(){ return isOnline() ? (feedTried && !feedOk ? 'Offline (no signal)' : 'Online') : 'Offline'; }

function drawFor(cat){
  if(isOnline()){
    var fp=feedPool(cat);
    if(fp.length) { refillIfLow(); return Promise.resolve(rand(fp)); }
    return refillFeed(cat?[cat]:G.included).then(function(){
      var fp2=feedPool(cat); if(fp2.length) return rand(fp2);
      var bp=bankPool(cat); return bp.length?rand(bp):null;
    });
  }
  var bp=bankPool(cat); if(bp.length) return Promise.resolve(rand(bp));
  var fp3=feedPool(cat); return Promise.resolve(fp3.length?rand(fp3):null);
}
function refillIfLow(){ if(isOnline() && !fetching){ var n=feedPool(null).length; if(n<8) refillFeed(G.included); } }

/* ---- game state ---- */
function emptyTally(){ return {answered:0,correct:0,steals:0,byCat:{}}; }
function bump(t,cat,correct){ t.answered++; if(!t.byCat[cat]) t.byCat[cat]={a:0,c:0}; t.byCat[cat].a++; if(correct){ t.correct++; t.byCat[cat].c++; } }

var Game = {
  CATS:CATS, TIERS:TIERS, pointsFor:pointsFor, stealPts:stealPts,
  onChange:null,
  get state(){ return G; },
  prefs: PREFS,
  isOnline:isOnline, modeLabel:modeLabel,
  seenCount:function(){ return Object.keys(SEEN).length; },
  feedCount:function(){ return feedPool(null).length; },
  remaining:function(cat){ return bankPool(cat).length + feedPool(cat).length; },
  loading:false,
  matchOver:function(){ return !!(G && G.qTarget>0 && G.turnsTaken[0]>=G.qTarget && G.turnsTaken[1]>=G.qTarget); },

  setMode:function(m){ PREFS.mode=m; save(LS.PREFS,PREFS); if(isOnline()) refillFeed(PREFS.included); this.notify(); },
  setPrefs:function(names,included){ PREFS.names=names; PREFS.included=included; save(LS.PREFS,PREFS); },
  notify:function(){ if(this.onChange) this.onChange(); },
  persist:function(){ save(LS.GAME,G); save(LS.SEEN,SEEN); },

  start:function(names,included,mode,qTarget){
    names=[ (names[0]||'Alex').trim()||'Alex', (names[1]||'Anthony').trim()||'Anthony' ];
    included = (included&&included.length)?included.slice():Object.keys(CATS);
    if(mode) PREFS.mode=mode;
    PREFS.names=names; PREFS.included=included; PREFS.qTarget=(qTarget>0?qTarget:0); save(LS.PREFS,PREFS);
    G = { players:[{name:names[0],score:0},{name:names[1],score:0}],
          ids:[Stats.normName(names[0]),Stats.normName(names[1])],
          turn:0, included:included, phase:'turn', qTarget:(qTarget>0?qTarget:0), turnsTaken:[0,0],
          card:null, pick:null, result:null,
          tally:[emptyTally(),emptyTally()], matchId:uuid(), ts:Date.now() };
    this.persist();
    if(isOnline()) refillFeed(included);
    this.notify();
  },

  pick:function(cat){
    var self=this; self.loading=true; self.notify();
    drawFor(cat).then(function(q){
      self.loading=false;
      if(!q){ self.notify(); if(window.LCT.toast) window.LCT.toast('No questions for that category right now.'); return; }
      var opts=shuffle([q.a].concat(q.w.slice(0,3)));
      G.card={ id:q.id, c:q.c, d:q.d, q:q.q, a:q.a, options:opts, correct:opts.indexOf(q.a), src:q.src };
      G.pick=null; G.result=null; G.phase='question';
      self.persist(); self.notify();
    });
  },

  answerActive:function(idx){
    var c=G.card; var correct = (idx===c.correct);
    bump(G.tally[G.turn], c.c, correct);
    if(correct){
      G.players[G.turn].score += pointsFor(c.d);
      G.result={ who:G.turn, chosen:idx, outcome:'active-correct', gained:pointsFor(c.d) };
      SEEN[c.id]=1; G.turnsTaken[G.turn]++; G.phase='result';
    } else {
      G.pick={ kind:'wrong', chosen:idx };
      G.phase='steal';
    }
    this.persist(); this.notify();
  },
  pass:function(){
    G.pick={ kind:'pass', chosen:-1 };
    G.phase='steal';
    this.persist(); this.notify();
  },
  stealPick:function(idx){
    var c=G.card, opp=1-G.turn; var correct=(idx===c.correct);
    bump(G.tally[opp], c.c, correct);
    var gained=0;
    if(correct){ gained=stealPts(pointsFor(c.d)); G.players[opp].score+=gained; G.tally[opp].steals++; }
    G.result={ who:opp, chosen:idx, outcome: correct?'steal-correct':'steal-wrong', gained:gained };
    SEEN[c.id]=1; G.turnsTaken[G.turn]++; G.phase='stealResult';
    this.persist(); this.notify();
  },
  next:function(){
    if(this.matchOver()){ this.end(); return; }
    G.card=null; G.pick=null; G.result=null;
    G.turn=1-G.turn; G.phase='turn';
    this.persist(); refillIfLow(); this.notify();
  },

  end:function(){
    var p0=G.players[0], p1=G.players[1];
    var answered=G.tally[0].answered+G.tally[1].answered;
    if(answered>0){
      var winnerId = (p0.score===p1.score) ? null : (p0.score>p1.score ? G.ids[0] : G.ids[1]);
      var match={ id:G.matchId, ts:Date.now(), crew:Stats.crew, winnerId:winnerId,
        players:[
          {id:G.ids[0],name:p0.name,answered:G.tally[0].answered,correct:G.tally[0].correct,steals:G.tally[0].steals,byCat:G.tally[0].byCat},
          {id:G.ids[1],name:p1.name,answered:G.tally[1].answered,correct:G.tally[1].correct,steals:G.tally[1].steals,byCat:G.tally[1].byCat}
        ]};
      Stats.record(match);
    }
    G.phase='over';
    this.persist(); this.notify();
  },
  rematch:function(){
    G.players[0].score=0; G.players[1].score=0; G.turn=0; G.phase='turn';
    G.card=null; G.pick=null; G.result=null; G.tally=[emptyTally(),emptyTally()]; G.turnsTaken=[0,0];
    G.matchId=uuid(); G.ts=Date.now();
    this.persist(); if(isOnline()) refillFeed(G.included); this.notify();
  },
  newGame:function(){ G=null; try{localStorage.removeItem(LS.GAME);}catch(e){} this.notify(); },
  resetSeen:function(){ SEEN={}; save(LS.SEEN,SEEN); this.notify(); },
  prefetch:function(){ if(isOnline()) refillFeed(PREFS.included); }
};
LCT.Game = Game;
})();
