/* Last Call Trivia — UI rendering + event delegation. */
(function(){
"use strict";
var LCT = window.LCT = window.LCT || {};
var Game = LCT.Game, Stats = LCT.Stats, CATS = Game.CATS, TIERS = Game.TIERS;
var KEYS = ['A','B','C','D'];

function $(id){ return document.getElementById(id); }
function esc(s){ return (s+'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function toast(m){ var t=$('toast'); if(!t)return; t.textContent=m; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(function(){t.classList.remove('show');},2200); }
LCT.toast = toast;
function pColor(i){ return i===0?'var(--p1)':'var(--p2)'; }
function pct(a,c){ return a>0?Math.round(100*c/a):0; }

var view='auto';                 /* 'auto' | 'home' | 'stats' */
var setup=null;

function render(){
  if(view==='stats'){ renderStats(); return; }
  var G=Game.state;
  if(view==='home' || !G){ renderHome(); return; }
  switch(G.phase){
    case 'turn': renderTurn(); break;
    case 'question': renderQuestion(); break;
    case 'steal': renderSteal(); break;
    case 'result': case 'stealResult': renderResult(); break;
    case 'over': renderOver(); break;
    default: renderHome();
  }
}
Game.onChange=render; Stats.onChange=function(){ if(view==='stats'||(!Game.state)||Game.state.phase==='over') render(); };

/* ---------- HOME ---------- */
function renderHome(){
  if(!setup){ setup={ names:(Game.prefs.names||['Alex','Anthony']).slice(), included:(Game.prefs.included||Object.keys(CATS)).slice(), mode:Game.prefs.mode||'auto', target:(Game.prefs.target||0), customOpen:false }; }
  var G=Game.state;
  var canResume = !!(G && G.phase && G.phase!=='over');
  var on=Game.isOnline();
  var chips=Object.keys(CATS).map(function(k){
    var sel=setup.included.indexOf(k)>=0;
    return '<button class="chip '+(sel?'sel':'')+'" data-action="toggleCat" data-cat="'+k+'"><span class="em">'+CATS[k].em+'</span>'+
      '<span><div>'+CATS[k].label+'</div><div class="meta">'+(window.LCT_BANK?window.LCT_BANK.filter(function(q){return q.c===k;}).length:0)+' offline</div></span></button>';
  }).join('');
  $('screen').innerHTML=
    '<div class="top"><div class="brand"><span class="logo">\u{1F37A}</span><span class="nm">Last Call</span></div>'+
      '<button class="modepill '+(on?'on':'off')+'" data-action="cycleMode" title="tap to change"><span class="led"></span>'+esc(Game.modeLabel())+'</button></div>'+
    '<div class="title-hero"><div class="logo">\u{1F37A}</div><h1>Last Call Trivia</h1>'+
      '<div class="sub">Alex vs Anthony • multiple choice • pass &amp; steal • no timer</div></div>'+
    (canResume?'<button class="btn primary" style="margin:14px 0 4px" data-action="resume">▶ Resume ('+esc(G.players[0].name)+' '+G.players[0].score+' – '+G.players[1].score+' '+esc(G.players[1].name)+')</button>':'')+
    '<div class="card stack" style="margin-top:14px">'+
      '<div class="row">'+
        '<div><label class="fld">Player 1</label><input class="txt" id="n0" value="'+esc(setup.names[0])+'" maxlength="14"></div>'+
        '<div><label class="fld">Player 2</label><input class="txt" id="n1" value="'+esc(setup.names[1])+'" maxlength="14"></div>'+
      '</div>'+
      '<div><label class="fld">Question source</label>'+
        '<div class="seg">'+
          '<button class="'+(setup.mode==='auto'?'on':'')+'" data-action="setMode" data-mode="auto">Auto</button>'+
          '<button class="'+(setup.mode==='online'?'on':'')+'" data-action="setMode" data-mode="online">Online</button>'+
          '<button class="'+(setup.mode==='offline'?'on':'')+'" data-action="setMode" data-mode="offline">Offline</button>'+
        '</div><div class="hint" style="margin-top:6px">Online pulls fresh questions from public trivia databases; Offline uses the '+(window.LCT_BANK?window.LCT_BANK.length:0)+' built-in ones. Auto picks based on your signal.</div></div>'+
      '<div style="margin-top:14px"><label class="fld">Match mode</label>'+
        '<div class="seg">'+
          '<button class="'+(!setup.customOpen&&!setup.target?'on':'')+'" data-action="setTarget" data-t="0">Open</button>'+
          '<button class="'+(!setup.customOpen&&setup.target===200?'on':'')+'" data-action="setTarget" data-t="200">200</button>'+
          '<button class="'+(!setup.customOpen&&setup.target===300?'on':'')+'" data-action="setTarget" data-t="300">300</button>'+
          '<button class="'+(!setup.customOpen&&setup.target===500?'on':'')+'" data-action="setTarget" data-t="500">500</button>'+
          '<button class="'+(setup.customOpen?'on':'')+'" data-action="customTarget">Custom</button>'+
        '</div>'+
        (setup.customOpen?'<input class="txt" id="targetCustom" type="number" inputmode="numeric" min="50" step="25" style="margin-top:8px" placeholder="Target points, e.g. 350" value="'+(setup.target||'')+'">':'')+
        '<div class="hint" style="margin-top:6px">'+(setup.target?'First to '+setup.target+' points wins the match.':'Open play — end the match from the menu whenever you like.')+'</div></div>'+
    '</div>'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin:20px 2px 10px">'+
      '<label class="fld" style="margin:0">Categories</label>'+
      '<span class="selcount">'+setup.included.length+' on • <a class="link" data-action="allCats">all</a> • <a class="link" data-action="noCats">none</a></span></div>'+
    '<div class="chips">'+chips+'</div>'+
    '<button class="btn primary" style="margin-top:18px;font-size:19px;padding:18px" data-action="startGame">Start Game</button>'+
    '<div class="row" style="margin-top:10px">'+
      '<button class="btn ghost" data-action="viewStats">\u{1F4CA} Stats</button>'+
      '<button class="btn ghost" data-action="openSettings">⚙️ Settings</button></div>'+
    '<div class="hint" style="margin-top:14px">\u{1F4F2} Add to Home Screen from your browser menu to play it like an app.</div>'+
    '<div style="height:20px"></div>';
}

/* ---------- HEADER ---------- */
function header(){
  var G=Game.state, a=G.players[0], b=G.players[1], on=Game.isOnline();
  return '<div class="top"><div class="brand"><span class="logo">\u{1F37A}</span>'+
      '<span class="modepill '+(on?'on':'off')+'" data-action="cycleMode"><span class="led"></span>'+esc(Game.modeLabel())+'</span></div>'+
      '<button class="iconbtn" data-action="openMenu">☰</button></div>'+
    '<div class="scorebar">'+
      '<div class="pscore p1 '+(G.turn===0?'active':'')+'"><span class="turntag">Up now</span><div class="nm"><span class="dot"></span>'+esc(a.name)+'</div><div class="val">'+a.score+'</div>'+(G.target?'<div class="prog"><div class="fill p1" style="width:'+Math.min(100,Math.round(100*a.score/G.target))+'%"></div></div>':'')+'</div></div>'+
      '<div class="pscore p2 '+(G.turn===1?'active':'')+'"><span class="turntag">Up now</span><div class="nm"><span class="dot"></span>'+esc(b.name)+'</div><div class="val">'+b.score+'</div>'+(G.target?'<div class="prog"><div class="fill p2" style="width:'+Math.min(100,Math.round(100*b.score/G.target))+'%"></div></div>':'')+'</div></div>'+(G.target?'<div class="goal">🏁 First to '+G.target+'</div>':'')+'';
}

/* ---------- TURN ---------- */
function renderTurn(){
  var G=Game.state;
  if(Game.loading){ $('screen').innerHTML=header()+'<div class="qcard" style="text-align:center"><div class="qtext">Pulling a question…</div></div>'; return; }
  var chips=G.included.map(function(k){
    var n=Game.remaining(k);
    return '<button class="chip" '+(n===0?'style="opacity:.45"':'')+' data-action="pick" data-cat="'+k+'"><span class="em">'+CATS[k].em+'</span>'+
      '<span><div>'+CATS[k].label+'</div><div class="meta">'+(Game.isOnline()?'online + '+n+' offline':n+' left')+'</div></span></button>';
  }).join('');
  $('screen').innerHTML=header()+
    '<div class="turnline" style="font-size:16px;margin-bottom:14px"><span class="dot" style="background:'+pColor(G.turn)+'"></span><b>'+esc(G.players[G.turn].name)+'</b>, pick a category</div>'+
    '<button class="chip rand" style="width:100%;justify-content:center;margin-bottom:12px;font-size:17px;padding:16px" data-action="pickRandom">\u{1F3B2} Surprise me</button>'+
    '<div class="chips">'+chips+'</div><div style="height:18px"></div>';
}

/* ---------- QUESTION / STEAL / RESULT ---------- */
function tierPill(d){ var t=TIERS[d]||TIERS[3]; return '<span class="tier '+t.cls+'">'+t.label+' · '+t.pts+'</span>'; }
function qHead(){ var c=Game.state.card; return '<div class="qhead"><span class="pill"><span class="em">'+CATS[c.c].em+'</span>'+CATS[c.c].label+'</span>'+tierPill(c.d)+'</div>'; }
function optionsHTML(phase){
  var G=Game.state, c=G.card, out='';
  for(var i=0;i<c.options.length;i++){
    var cls='opt', attr='', dis='';
    if(phase==='question'){ attr=' data-action="answer" data-idx="'+i+'"'; }
    else if(phase==='steal'){
      if(G.pick && G.pick.kind==='wrong' && i===G.pick.chosen){ cls+=' wrong dim'; dis=' disabled'; }
      else { attr=' data-action="steal" data-idx="'+i+'"'; }
    } else { /* result */
      dis=' disabled';
      if(i===c.correct) cls+=' correct';
      else if(G.result && i===G.result.chosen) cls+=' wrong';
      else cls+=' dim';
    }
    out+='<button class="'+cls+'"'+attr+dis+'><span class="key">'+KEYS[i]+'</span><span>'+esc(c.options[i])+'</span></button>';
  }
  return out;
}
function renderQuestion(){
  var G=Game.state, c=G.card;
  $('screen').innerHTML=header()+qHead()+
    '<div class="qcard"><div class="turnline"><span class="dot" style="background:'+pColor(G.turn)+'"></span>'+esc(G.players[G.turn].name)+'’s question · <span class="points">'+TIERS[c.d].pts+' pts</span></div>'+
      '<div class="qtext">'+esc(c.q)+'</div></div>'+
    '<div class="opts">'+optionsHTML('question')+'</div>'+
    '<button class="btn ghost" style="margin-top:12px" data-action="pass">Pass — let '+esc(G.players[1-G.turn].name)+' steal</button>';
}
function renderSteal(){
  var G=Game.state, c=G.card, opp=1-G.turn, sp=Game.stealPts(TIERS[c.d].pts);
  var msg = (G.pick && G.pick.kind==='pass')
    ? esc(G.players[G.turn].name)+' passed.'
    : esc(G.players[G.turn].name)+' missed.';
  $('screen').innerHTML=header()+qHead()+
    '<div class="qcard"><div class="qtext">'+esc(c.q)+'</div></div>'+
    '<div class="banner steal">'+msg+' <b>'+esc(G.players[opp].name)+'</b>, steal it for '+sp+' pts — pick one:</div>'+
    '<div class="opts" style="margin-top:12px">'+optionsHTML('steal')+'</div>';
}
function renderResult(){
  var G=Game.state, c=G.card, r=G.result;
  var banner;
  if(r.outcome==='active-correct') banner='<div class="banner good">✅ '+esc(G.players[r.who].name)+' nailed it! +'+r.gained+'</div>';
  else if(r.outcome==='steal-correct') banner='<div class="banner good">\u{1F3AF} '+esc(G.players[r.who].name)+' stole it! +'+r.gained+'</div>';
  else banner='<div class="banner bad">❌ No one got it. The answer was highlighted.</div>';
  $('screen').innerHTML=header()+qHead()+
    '<div class="qcard"><div class="qtext">'+esc(c.q)+'</div></div>'+
    '<div class="opts">'+optionsHTML('result')+'</div>'+
    banner+
    (Game.matchOver()?'<div class="banner steal" style="margin-top:10px">🏁 '+esc(G.players[G.players[0].score>=G.players[1].score?0:1].name)+' hit '+G.target+' — match!</div>':'')+
    '<button class="btn primary" style="margin-top:14px" data-action="next">'+(Game.matchOver()?'See final score →':'Next →')+'</button>';
}

/* ---------- OVER ---------- */
function renderOver(){
  var G=Game.state, a=G.players[0], b=G.players[1];
  var winner = a.score===b.score?null:(a.score>b.score?0:1);
  $('screen').innerHTML=
    '<div class="title-hero" style="padding-top:26px"><div class="big-final">'+(winner===null?'\u{1F91D}':'\u{1F3C6}')+'</div></div>'+
    '<div class="winner">'+(winner===null?'Tie game at '+a.score+'!':esc(G.players[winner].name)+' wins, '+G.players[winner].score+'–'+G.players[1-winner].score+'!')+'</div>'+
    '<div class="scorebar" style="margin-top:16px">'+
      '<div class="pscore p1"><div class="nm"><span class="dot"></span>'+esc(a.name)+'</div><div class="val">'+a.score+'</div></div>'+
      '<div class="pscore p2"><div class="nm"><span class="dot"></span>'+esc(b.name)+'</div><div class="val">'+b.score+'</div></div></div>'+
    '<div class="statgrid">'+
      '<div class="s"><div class="v">'+(G.tally[0].answered+G.tally[1].answered)+'</div><div class="k">Questions</div></div>'+
      '<div class="s"><div class="v">'+(G.tally[0].steals+G.tally[1].steals)+'</div><div class="k">Steals</div></div>'+
      '<div class="s"><div class="v">'+(G.tally[0].correct+G.tally[1].correct)+'</div><div class="k">Correct</div></div></div>'+
    '<div class="stack" style="margin-top:20px">'+
      '<button class="btn primary" data-action="rematch">Rematch</button>'+
      '<button class="btn ghost" data-action="viewStats">\u{1F4CA} View running stats</button>'+
      '<button class="btn ghost" data-action="newGame">New game / change players</button></div>'+
    '<div class="hint" style="margin-top:14px">Result saved to your stats'+(Stats.syncState==='synced'?' and synced.':'.')+'</div>';
}

/* ---------- STATS ---------- */
function syncBadge(){
  var s=Stats.syncState, color={synced:'var(--good)',syncing:'var(--gold)',local:'var(--muted)',unknown:'var(--muted)'}[s]||'var(--muted)';
  var label={synced:'Synced across devices',syncing:'Syncing…',local:'Local only (deploy backend to sync)',unknown:'Local'}[s]||'Local';
  return '<span class="synced" style="color:'+color+'"><span class="led" style="background:'+color+'"></span>'+label+'</span>';
}
function bestWorst(P){
  var best=null,worst=null;
  for(var c in (P.byCat||{})){ var v=P.byCat[c]; if(v.a<2) continue; var acc=v.c/v.a;
    if(!best||acc>best.acc) best={c:c,acc:acc,a:v.a}; if(!worst||acc<worst.acc) worst={c:c,acc:acc,a:v.a}; }
  return {best:best,worst:worst};
}
function renderStats(){
  var agg=Stats.display();
  var idA=Stats.normName(Game.prefs.names[0]||'Alex'), idB=Stats.normName(Game.prefs.names[1]||'Anthony');
  var A=agg.players[idA]||{name:Game.prefs.names[0]||'Alex',games:0,wins:0,losses:0,ties:0,answered:0,correct:0,steals:0,bestStreak:0,byCat:{}};
  var B=agg.players[idB]||{name:Game.prefs.names[1]||'Anthony',games:0,wins:0,losses:0,ties:0,answered:0,correct:0,steals:0,bestStreak:0,byCat:{}};
  var cats={}; [A,B].forEach(function(P){ for(var c in (P.byCat||{})) if(P.byCat[c].a>0) cats[c]=1; });
  var catKeys=Object.keys(cats).sort(function(x,y){ return (CATS[x]?CATS[x].label:x).localeCompare(CATS[y]?CATS[y].label:y); });
  var catRows=catKeys.map(function(c){
    var va=A.byCat[c]||{a:0,c:0}, vb=B.byCat[c]||{a:0,c:0};
    return '<div style="margin:12px 0 4px;font-size:13px;font-weight:800;color:var(--muted)">'+(CATS[c]?CATS[c].em+' '+CATS[c].label:c)+'</div>'+
      barRow('p1',pct(va.a,va.c),va.a)+barRow('p2',pct(vb.a,vb.c),vb.a);
  }).join('') || '<div class="hint" style="margin-top:14px">Play a few rounds to build category stats.</div>';
  var bwA=bestWorst(A), bwB=bestWorst(B);
  function bw(o){ if(!o.best) return '<span class="muted">—</span>'; var bs=CATS[o.best.c]?CATS[o.best.c].label:o.best.c; var ws=o.worst&&o.worst.c!==o.best.c?(CATS[o.worst.c]?CATS[o.worst.c].label:o.worst.c):null; return 'Best: <b>'+esc(bs)+'</b>'+(ws?'<br>Worst: <b>'+esc(ws)+'</b>':''); }
  $('screen').innerHTML=
    '<div class="top"><div class="brand"><span class="logo">\u{1F4CA}</span><span class="nm">Stats</span></div>'+
      '<button class="iconbtn" data-action="viewHome">✕</button></div>'+
    '<div style="text-align:center;margin-bottom:10px">'+syncBadge()+'</div>'+
    '<div class="vs">'+
      '<div class="pcol"><div class="nm"><span class="dot" style="background:var(--p1);width:10px;height:10px;border-radius:50%"></span>'+esc(A.name)+'</div>'+
        '<div class="wl" style="color:var(--p1)">'+A.wins+'–'+A.losses+(A.ties?'–'+A.ties:'')+'</div><div class="sub">W – L'+(A.ties?' – T':'')+'</div></div>'+
      '<div class="mid">VS<div style="font-size:11px;margin-top:4px">'+ (A.games+B.games) +' games</div></div>'+
      '<div class="pcol"><div class="nm"><span class="dot" style="background:var(--p2);width:10px;height:10px;border-radius:50%"></span>'+esc(B.name)+'</div>'+
        '<div class="wl" style="color:var(--p2)">'+B.wins+'–'+B.losses+(B.ties?'–'+B.ties:'')+'</div><div class="sub">W – L'+(B.ties?' – T':'')+'</div></div>'+
    '</div>'+
    '<div class="statgrid"><div class="s"><div class="v" style="color:var(--p1)">'+pct(A.answered,A.correct)+'%</div><div class="k">'+esc(A.name)+' accuracy</div></div>'+
      '<div class="s"><div class="v" style="color:var(--p2)">'+pct(B.answered,B.correct)+'%</div><div class="k">'+esc(B.name)+' accuracy</div></div></div>'+
    '<div class="statgrid"><div class="s"><div class="v">'+A.bestStreak+'</div><div class="k">'+esc(A.name)+' best streak</div></div>'+
      '<div class="s"><div class="v">'+B.bestStreak+'</div><div class="k">'+esc(B.name)+' best streak</div></div></div>'+
    '<div class="statgrid"><div class="s" style="text-align:left;font-size:12.5px;line-height:1.5">'+bw(bwA)+'</div>'+
      '<div class="s" style="text-align:left;font-size:12.5px;line-height:1.5">'+bw(bwB)+'</div></div>'+
    '<h3 style="margin:22px 2px 4px;font-size:16px">Accuracy by category</h3>'+
    '<div class="hint" style="text-align:left;margin:0 2px 6px">Amber = '+esc(A.name)+', teal = '+esc(B.name)+'. Bars show % correct.</div>'+
    '<div class="catbars">'+catRows+'</div>'+
    '<div class="row" style="margin-top:20px"><button class="btn ghost" data-action="viewHome">← Back</button>'+
      '<button class="btn ghost" data-action="openSettings">⚙️ Settings</button></div>'+
    '<div style="height:18px"></div>';
}
function barRow(p,percent,n){
  return '<div class="statrow"><div class="lab"><span class="dot" style="width:9px;height:9px;border-radius:50%;background:var(--'+p+')"></span></div>'+
    '<div class="bar"><div class="fill '+p+'" style="width:'+(n?Math.max(percent,3):0)+'%"></div><div class="pct">'+(n?percent+'% ('+n+')':'—')+'</div></div></div>';
}

/* ---------- SHEETS ---------- */
function sheet(html){ var s=$('sheet'); s.innerHTML='<div class="grip"></div>'+html; s.classList.add('show'); $('scrim').classList.add('show'); }
function closeSheet(){ $('sheet').classList.remove('show'); $('scrim').classList.remove('show'); }
LCT.closeSheet=closeSheet;
function openMenu(){
  var G=Game.state;
  sheet('<h3>Game menu</h3>'+
    '<div class="setting"><div><div class="t">View stats</div><div class="d">Wins, accuracy, category breakdown</div></div><button class="btn ghost sm" style="width:auto;flex:none" data-action="viewStats">Open</button></div>'+
    '<div class="setting"><div><div class="t">Question source</div><div class="d">Currently: '+esc(Game.modeLabel())+'</div></div>'+
      '<div class="seg" style="flex:none;width:auto"><button class="'+(Game.prefs.mode==='auto'?'on':'')+'" data-action="setModeLive" data-mode="auto">Auto</button><button class="'+(Game.prefs.mode==='online'?'on':'')+'" data-action="setModeLive" data-mode="online">On</button><button class="'+(Game.prefs.mode==='offline'?'on':'')+'" data-action="setModeLive" data-mode="offline">Off</button></div></div>'+
    '<div class="setting"><div><div class="t">Reset answered-memory</div><div class="d">Replay questions you’ve already seen</div></div><button class="btn ghost sm" style="width:auto;flex:none" data-action="resetSeen">Reset</button></div>'+
    '<div class="setting"><div><div class="t">End game</div><div class="d">Save the result &amp; see final score</div></div><button class="btn ghost sm" style="width:auto;flex:none" data-action="end">End</button></div>'+
    '<button class="btn ghost" style="margin-top:8px" data-action="openSettings">⚙️ Settings &amp; sync</button>');
}
function openSettings(){
  sheet('<h3>Settings</h3>'+
    '<div class="setting"><div style="flex:1"><div class="t">Crew code (for synced stats)</div><div class="d">Both phones use the SAME code to share stats.</div>'+
      '<input class="txt" id="crewInput" style="margin-top:8px" value="'+esc(Stats.crew)+'" maxlength="40"></div></div>'+
    '<button class="btn primary sm" style="margin:10px 0" data-action="saveCrew">Save crew code</button>'+
    '<div class="setting"><div><div class="t">Sync status</div><div class="d">'+esc({synced:'Synced across devices',syncing:'Syncing',local:'Local only — backend not deployed yet',unknown:'Not yet checked'}[Stats.syncState]||'Local')+'</div></div>'+
      '<button class="btn ghost sm" style="width:auto;flex:none" data-action="syncNow">Sync now</button></div>'+
    '<div class="setting"><div><div class="t">How to play</div><div class="d">Pick a category, tap your answer. Miss it and the other player steals from the remaining options for half points. Pass for a clean steal. No timer.</div></div></div>'+
    '<div class="hint" style="text-align:left;margin-top:10px">Synced stats need the Netlify Function deployed (see README). Until then everything works locally on each phone.</div>'+
    '<button class="btn primary" style="margin-top:12px" data-action="closeSheet">Done</button>');
}

/* ---------- ACTIONS ---------- */
function captureHome(){ var a=$('n0'),b=$('n1'); if(a&&b&&setup){ setup.names=[a.value,b.value]; } var tc=$('targetCustom'); if(tc&&setup){ var v=parseInt(tc.value,10); setup.target=(v>0?v:0); } }
var actions={
  cycleMode:function(){ var order=['auto','online','offline']; var m=Game.prefs.mode||'auto'; var nm=order[(order.indexOf(m)+1)%3]; if(setup)setup.mode=nm; Game.setMode(nm); toast('Source: '+Game.modeLabel()); },
  setMode:function(el){ captureHome(); setup.mode=el.getAttribute('data-mode'); Game.prefs.mode=setup.mode; render(); },
  setModeLive:function(el){ Game.setMode(el.getAttribute('data-mode')); closeSheet(); },
  toggleCat:function(el){ captureHome(); var k=el.getAttribute('data-cat'); var i=setup.included.indexOf(k); if(i>=0)setup.included.splice(i,1); else setup.included.push(k); render(); },
  allCats:function(){ captureHome(); setup.included=Object.keys(CATS); render(); },
  noCats:function(){ captureHome(); setup.included=[]; render(); },
  setTarget:function(el){ captureHome(); setup.target=parseInt(el.getAttribute('data-t'),10)||0; setup.customOpen=false; render(); },
  customTarget:function(){ captureHome(); setup.customOpen=true; render(); },
  startGame:function(){ captureHome(); var inc=setup.included.slice(); if(!inc.length){ inc=Object.keys(CATS); toast('No categories picked — using all.'); } Game.start(setup.names,inc,setup.mode,setup.target); view='auto'; render(); },
  resume:function(){ view='auto'; render(); },
  viewStats:function(){ closeSheet(); view='stats'; Stats.refresh(); render(); },
  viewHome:function(){ view='home'; render(); },
  openMenu:openMenu, openSettings:function(){ openSettings(); }, closeSheet:closeSheet,
  pick:function(el){ Game.pick(el.getAttribute('data-cat')); },
  pickRandom:function(){ Game.pick(null); },
  answer:function(el){ Game.answerActive(parseInt(el.getAttribute('data-idx'),10)); },
  pass:function(){ Game.pass(); },
  steal:function(el){ Game.stealPick(parseInt(el.getAttribute('data-idx'),10)); },
  next:function(){ Game.next(); },
  end:function(){ closeSheet(); Game.end(); },
  rematch:function(){ Game.rematch(); view='auto'; render(); },
  newGame:function(){ Game.newGame(); setup=null; view='home'; render(); },
  resetSeen:function(){ Game.resetSeen(); closeSheet(); toast('Answered-memory cleared'); },
  saveCrew:function(){ var el=$('crewInput'); if(el){ Stats.setCrew(el.value); toast('Crew code saved'); } closeSheet(); },
  syncNow:function(){ toast('Syncing…'); Stats.refresh(); },
  cycleModeHome:function(){ actions.cycleMode(); }
};
document.addEventListener('click',function(e){
  var el=e.target.closest('[data-action]'); if(!el) return;
  var fn=actions[el.getAttribute('data-action')]; if(fn){ e.preventDefault(); fn(el); }
});
if(typeof window!=='undefined'){ window.addEventListener('online',render); window.addEventListener('offline',render); window.addEventListener('pagehide',function(){ Game.persist(); }); }

Game.prefetch();
Stats.refresh();
render();
})();
