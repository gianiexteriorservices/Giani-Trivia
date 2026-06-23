/* Synced stats backend for Last Call Trivia (Netlify Blobs).
   GET  /api/stats?crew=CODE   -> current aggregate JSON
   POST /api/stats?crew=CODE   -> {matches:[...]} applied idempotently; returns merged aggregate
   The applyMatches logic mirrors stats.js on the client so both agree. */
import { getStore } from "@netlify/blobs";

function emptyAgg(){ return { v:1, applied:{}, players:{}, updated:0 }; }
function freshPlayer(name){ return { name:name||"Player", games:0,wins:0,losses:0,ties:0,answered:0,correct:0,steals:0,streak:0,bestStreak:0,byCat:{} }; }

function applyMatches(base, matches){
  if(!base) base = emptyAgg();
  if(!base.applied) base.applied = {};
  if(!base.players) base.players = {};
  const sorted = (matches||[]).slice().sort((a,b)=> (a.ts||0)-(b.ts||0));
  for(const m of sorted){
    if(!m || !m.id || base.applied[m.id]) continue;
    base.applied[m.id] = true;
    for(const pl of (m.players||[])){
      const P = base.players[pl.id] || (base.players[pl.id] = freshPlayer(pl.name));
      if(pl.name) P.name = pl.name;
      P.games++; P.answered += pl.answered||0; P.correct += pl.correct||0; P.steals += pl.steals||0;
      const bc = pl.byCat || {};
      for(const c in bc){ if(!P.byCat[c]) P.byCat[c]={a:0,c:0}; P.byCat[c].a += bc[c].a||0; P.byCat[c].c += bc[c].c||0; }
      if(m.winnerId == null){ P.ties++; }
      else if(m.winnerId === pl.id){ P.wins++; P.streak++; if(P.streak > P.bestStreak) P.bestStreak = P.streak; }
      else { P.losses++; P.streak = 0; }
    }
    if((m.ts||0) > base.updated) base.updated = m.ts;
  }
  return base;
}

function cleanCrew(s){ return ((s||"default").toLowerCase().replace(/[^a-z0-9_-]/g,"")).slice(0,40) || "default"; }

export default async (req) => {
  const url = new URL(req.url);
  const crew = cleanCrew(url.searchParams.get("crew"));
  const store = getStore({ name: "lct-stats", consistency: "strong" });
  const key = "crew_" + crew;

  if(req.method === "GET"){
    const data = (await store.get(key, { type: "json" })) || emptyAgg();
    return Response.json(data);
  }
  if(req.method === "POST"){
    let body = {};
    try { body = await req.json(); } catch (e) {}
    const base = (await store.get(key, { type: "json" })) || emptyAgg();
    const merged = applyMatches(base, Array.isArray(body.matches) ? body.matches : []);
    await store.setJSON(key, merged);
    return Response.json(merged);
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/stats" };
