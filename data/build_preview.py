#!/usr/bin/env python3
"""Build a self-contained interactive HTML preview of the RiverGuard dataset.

Reads daily_observations.csv + monthly_summary.csv and writes
dataset_preview.html (no external JS/CSS - works offline, no CDN needed).

    python data/build_preview.py
"""
import json
from pathlib import Path

import pandas as pd

OUT = Path(__file__).resolve().parent
df = pd.read_csv(OUT / "daily_observations.csv")
monthly = pd.read_csv(OUT / "monthly_summary.csv")

CITY_ORDER = ["Quezon City", "Marikina", "Manila", "Pasig"]
ALARMS = {
    "Quezon City": [13.0, 14.0, 15.0],
    "Marikina": [15.0, 16.0, 18.0],
    "Manila": [12.0, 12.5, 13.0],
    "Pasig": [12.0, 12.5, 13.0],
}
STATIONS = {
    c: df.loc[df.Location == c, "Station_ID"].iloc[0] for c in CITY_ORDER
}

dates = sorted(df["Date"].unique())
city_payload = []
for city in CITY_ORDER:
    sub = df[df.Location == city].set_index("Date").loc[dates]
    city_payload.append({
        "name": city,
        "station": STATIONS[city],
        "alarms": ALARMS[city],
        "rain": [round(float(v), 1) for v in sub["Rainfall_mm"]],
        "wl": [round(float(v), 2) for v in sub["WaterLevel_m"]],
        "flood": [int(v) for v in sub["FloodOccurrence"]],
        "split": list(sub["Split"]),
        "source": list(sub["RainSource"]),
    })

# ---- aggregates -----------------------------------------------------------
by_split = (df.groupby("Split")
              .agg(rows=("Date", "size"), floods=("FloodOccurrence", "sum"))
              .reindex(["train", "validation", "test"]))
by_city = (df.groupby("Location")
             .agg(rows=("Date", "size"), floods=("FloodOccurrence", "sum"),
                  rain=("Rainfall_mm", "sum"), maxwl=("WaterLevel_m", "max"),
                  wl_mean=("WaterLevel_m", "mean"))
             .loc[CITY_ORDER].round(2))

source_rows = df["RainSource"].value_counts().to_dict()
real_rows = int(df["RainSource"].isin(["ERA5-reanalysis", "ERA5-anchor"]).sum())

top_events = (df[df.FloodOccurrence == 1]
                .sort_values("WaterLevel_m", ascending=False)
                .head(14)[["Date", "Location", "Rainfall_mm", "AntecedentRain_7d_mm",
                           "WaterLevel_m", "RiskLevel", "RainSource"]]
                .to_dict("records"))

# monthly pivot for heatmap: year x month per city
monthly["Year"] = monthly["Month"].str[:4].astype(int)
monthly["Mon"] = monthly["Month"].str[5:7].astype(int)
heat = {}
for city in CITY_ORDER:
    col = f"Rain_{city.replace(' ', '')}_mm"
    piv = (monthly.pivot(index="Year", columns="Mon", values=col)
                  .reindex(columns=range(1, 13)).round(1))
    heat[city] = [[None if pd.isna(v) else float(v) for v in row] for row in piv.values]
years = sorted(monthly["Year"].unique().tolist())

risk = df["RiskLevel"].value_counts().reindex(["Low", "Moderate", "High", "Very High"]).fillna(0).astype(int).to_dict()

payload = {
    "dates": dates,
    "cities": city_payload,
    "years": years,
    "heat": heat,
    "monthly": monthly[["Month", "FloodDays_AllCities"]].to_dict("records"),
    "stats": {
        "rows": int(len(df)),
        "cities": len(CITY_ORDER),
        "days": len(dates),
        "start": dates[0],
        "end": dates[-1],
        "real_rows": real_rows,
        "sources": source_rows,
        "floods": int(df.FloodOccurrence.sum()),
        "rate": round(float(df.FloodOccurrence.mean()) * 100, 2),
        "rain_total": round(float(df.Rainfall_mm.sum()), 0),
        "risk": risk,
    },
    "by_split": by_split.reset_index().rename(columns={"index": "split"}).to_dict("records"),
    "by_city": by_city.reset_index().to_dict("records"),
    "events": top_events,
}

HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RiverGuard — NCR Dataset Preview</title>
<style>
  :root{
    --bg:#0b1220; --panel:#111c2e; --panel2:#16233a; --line:#22314b;
    --ink:#e8eef7; --muted:#8ba0bd; --accent:#2a9d8f; --accent2:#4a9df0;
    --warn:#e9c46a; --high:#f4a261; --crit:#e76f51; --ok:#43c59e;
  }
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(1200px 600px at 20% -10%,#16263f 0%,var(--bg) 55%);
       color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:1180px;margin:0 auto;padding:28px 20px 60px}
  h1{font-size:26px;margin:0 0 4px;letter-spacing:-.3px}
  h2{font-size:17px;margin:0 0 2px}
  .sub{color:var(--muted);margin:0 0 22px}
  .badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:99px;
         border:1px solid var(--line);color:var(--muted);margin-left:8px;vertical-align:middle}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:26px}
  .card{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line);
        border-radius:14px;padding:14px 16px}
  .card .k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
  .card .v{font-size:24px;font-weight:650;margin-top:4px;letter-spacing:-.5px}
  .card .n{font-size:11px;color:var(--muted);margin-top:2px}
  .panel{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px 18px 10px;margin-bottom:22px}
  .panel-head{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline;justify-content:space-between;margin-bottom:6px}
  .panel p.note{color:var(--muted);margin:2px 0 12px;font-size:12px}
  .controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 10px}
  button.tab{background:var(--panel2);color:var(--muted);border:1px solid var(--line);border-radius:99px;
        padding:5px 13px;font-size:12px;cursor:pointer;transition:.15s}
  button.tab:hover{color:var(--ink);border-color:#33507a}
  button.tab.on{background:var(--accent);border-color:var(--accent);color:#04211d;font-weight:650}
  select{background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:5px 8px;font-size:12px}
  svg{display:block;width:100%;height:auto;overflow:visible}
  .legend{display:flex;flex-wrap:wrap;gap:14px;font-size:11px;color:var(--muted);margin-top:8px}
  .legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:middle}
  .tip{position:fixed;pointer-events:none;background:#0a1526;border:1px solid #2c4straight;border:1px solid #2c4467;
       border-radius:9px;padding:8px 10px;font-size:12px;color:var(--ink);box-shadow:0 10px 24px rgba(0,0,0,.45);
       opacity:0;transition:opacity .1s;z-index:99;white-space:nowrap}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line)}
  th{color:var(--muted);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  td.num{font-variant-numeric:tabular-nums}
  tr:hover td{background:#152238}
  .pill{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:600}
  .pill.VeryHigh{background:rgba(231,111,81,.16);color:#ff9b82}
  .pill.High{background:rgba(244,162,97,.16);color:#f6b98a}
  .pill.Moderate{background:rgba(233,196,106,.16);color:#ecd58f}
  .pill.Low{background:rgba(67,197,158,.14);color:#7fd9bd}
  .grid2{display:grid;grid-template-columns:1.35fr 1fr;gap:22px}
  @media(max-width:860px){.grid2{grid-template-columns:1fr}}
  .foot{color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:14px;margin-top:8px}
  .swatch{width:11px;height:11px;border-radius:3px;display:inline-block;margin-right:6px;vertical-align:-1px}
</style>
</head>
<body>
<div class="wrap">
  <h1>RiverGuard · NCR flood dataset<span class="badge" id="version">v2</span></h1>
  <p class="sub" id="coverage"></p>

  <div class="cards" id="cards"></div>

  <div class="panel">
    <div class="panel-head">
      <div><h2>Daily rainfall &amp; river level</h2>
      <p class="note">Bars = rainfall (mm/day, left axis). Line = modelled water level (m, right axis). Dashed lines = alarm levels. Shaded band = real ERA5 period.</p></div>
      <div class="controls" id="cityTabs"></div>
    </div>
    <div class="controls">
      <label style="color:var(--muted);font-size:12px">Window
        <select id="range">
          <option value="1095">last 3 years</option>
          <option value="365" selected>last 12 months</option>
          <option value="1827">last 5 years</option>
          <option value="all">all 2016–2026</option>
        </select>
      </label>
      <span style="color:var(--muted);font-size:12px" id="windowLabel"></span>
    </div>
    <svg id="series" viewBox="0 0 900 320" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="legend" id="seriesLegend"></div>
  </div>

  <div class="grid2">
    <div class="panel">
      <div class="panel-head"><div><h2>Rainfall by year &amp; month</h2>
      <p class="note">Monthly totals (mm) for the selected city. Darker = wetter. Wet season May–Oct dominates every year.</p></div></div>
      <svg id="heat" viewBox="0 0 640 300" preserveAspectRatio="xMidYMid meet"></svg>
      <div class="legend"><span><i style="background:#16233a"></i>0 mm</span><span><i style="background:#1f6f8b"></i>150</span><span><i style="background:#2a9d8f"></i>300</span><span><i style="background:#e9c46a"></i>450</span><span><i style="background:#e76f51"></i>600+</span></div>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h2>Rainfall → water level</h2>
      <p class="note">Every modelling day. Red = flood-proxy positive. Clear separation high on the y-axis.</p></div></div>
      <svg id="scatter" viewBox="0 0 520 320" preserveAspectRatio="xMidYMid meet"></svg>
      <div class="legend"><span><i style="background:#3b6fa0"></i>no flood</span><span><i style="background:#e76f51"></i>flood proxy = 1</span></div>
    </div>
  </div>

  <div class="grid2">
    <div class="panel">
      <div class="panel-head"><div><h2>Rainfall-source coverage</h2>
      <p class="note">Rows per month split by provenance. The recent block is real ERA5 reanalysis.</p></div></div>
      <svg id="covChart" viewBox="0 0 640 230" preserveAspectRatio="xMidYMid meet"></svg>
      <div class="legend"><span><i style="background:#4a9df0"></i>synthetic-calibrated</span><span><i style="background:#43c59e"></i>ERA5 reanalysis (real)</span></div>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h2>Class balance &amp; splits</h2>
      <p class="note">Flood positives are rare (2.1%) — use precision/recall, PR-AUC and class weights, not accuracy.</p></div></div>
      <svg id="balance" viewBox="0 0 520 230" preserveAspectRatio="xMidYMid meet"></svg>
      <div id="splitTable" style="margin-top:6px"></div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><div><h2>Largest modelled flood days</h2>
    <p class="note">Top water levels in the dataset. Ulysses 2020-11-12 is the peak event and is anchored to real ERA5 rainfall.</p></div></div>
    <div style="overflow:auto"><table id="events"><thead><tr>
      <th>Date</th><th>City</th><th>Rain (mm)</th><th>Antecedent 7d (mm)</th><th>Water level (m)</th><th>Risk</th><th>Rain source</th>
    </tr></thead><tbody></tbody></table></div>
  </div>

  <div class="panel">
    <div class="panel-head"><div><h2>Per-city summary</h2>
    <p class="note">Same schema per city; alarm levels differ by river and drive the flood proxy.</p></div></div>
    <div style="overflow:auto"><table id="cities"><thead><tr>
      <th>City</th><th>Station</th><th>Rows</th><th>Total rain (mm)</th><th>Mean water level (m)</th><th>Max WL (m)</th><th>Flood days</th><th>Alarms (m)</th>
    </tr></thead><tbody></tbody></table></div>
  </div>

  <p class="foot">
    <b>How to read this honestly:</b>
    <span class="swatch" style="background:#43c59e"></span>rainfall 2025-11-15 → 2026-11-14 is real ERA5 reanalysis (Open-Meteo);
    everything earlier is synthetic but calibrated to PAGASA 1991–2020 normals.
    Water level and soil moisture are <i>derived</i> from rainfall — not gauge readings.
    <span class="swatch" style="background:#e76f51"></span>FloodOccurrence is a documented rule-based proxy, not an official event label.
    Generated __GEN__ · <code>data/build_preview.py</code>
  </p>
</div>
<div class="tip" id="tip"></div>

<script>
const D = __DATA__;
const CITY_COLORS = {"Quezon City":"#4a9df0","Marikina":"#e76f51","Manila":"#e9c46a","Pasig":"#43c59e"};
const tip = document.getElementById('tip');
function showTip(evt, html){
  tip.innerHTML = html; tip.style.opacity = 1;
  const x = Math.min(evt.clientX + 14, window.innerWidth - tip.offsetWidth - 10);
  const y = Math.max(evt.clientY - 40, 8);
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
function hideTip(){ tip.style.opacity = 0; }
const SVGNS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent){
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
const fmt = (v, d=1) => Number(v).toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d});

/* ---------- header ---------- */
const S = D.stats;
document.getElementById('coverage').textContent =
  `${fmt(S.rows,0)} rows · ${S.cities} cities · ${fmt(S.days,0)} days · ${S.start} → ${S.end} · ${S.floods} flood-positive days (${S.rate}%)`;
const cards = [
  ["Rows", fmt(S.rows,0), `${fmt(S.days,0)} days × ${S.cities} cities`],
  ["Coverage", `${S.start.slice(0,4)}–${S.end.slice(0,4)}`, `through ${S.end}`],
  ["Real observations", fmt(S.real_rows,0), `${(S.real_rows/S.rows*100).toFixed(1)}% of rows (ERA5)`],
  ["Flood positives", fmt(S.floods,0), `${S.rate}% prevalence`],
  ["Train / val / test", D.by_split.map(s=>fmt(s.rows,0)).join(' / '), "chronological split"],
  ["Total rainfall", fmt(S.rain_total/1000,1)+" m", "all cities, all years"],
];
document.getElementById('cards').innerHTML = cards.map(([k,v,n])=>
  `<div class="card"><div class="k">${k}</div><div class="v">${v}</div><div class="n">${n}</div></div>`).join('');

/* ---------- city tabs ---------- */
let cityIdx = 0;
const tabs = document.getElementById('cityTabs');
D.cities.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'tab' + (i === 0 ? ' on' : ''); b.textContent = c.name;
  b.onclick = () => { cityIdx = i; [...tabs.children].forEach((x,j)=>x.classList.toggle('on', j===i));
                      drawSeries(); drawHeat(); drawScatter(); };
  tabs.appendChild(b);
});

/* ---------- time series ---------- */
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function drawSeries(){
  const c = D.cities[cityIdx];
  const sel = document.getElementById('range').value;
  const win = sel === 'all' ? D.dates.length : Math.min(parseInt(sel), D.dates.length);
  const i0 = D.dates.length - win;
  const svg = document.getElementById('series'); svg.innerHTML = '';
  const W = 900, H = 320, L = 48, R = 52, T = 16, B = 34;
  const dates = D.dates.slice(i0), rain = c.rain.slice(i0), wl = c.wl.slice(i0), fl = c.flood.slice(i0);
  const n = dates.length;
  const maxRain = Math.max(20, ...rain);
  const wlMin = Math.min(...wl, c.alarms[0] - 2), wlMax = Math.max(...wl, c.alarms[2] + 0.5);
  const x = i => L + (i / Math.max(n - 1, 1)) * (W - L - R);
  const yR = v => T + (1 - v / maxRain) * (H - T - B);
  const yW = v => T + (1 - (v - wlMin) / (wlMax - wlMin)) * (H - T - B);

  // ERA5 real band
  const firstReal = c.source.slice(i0).findIndex(s => s !== 'synthetic-calibrated');
  if (firstReal >= 0) {
    el('rect', {x:x(firstReal), y:T, width:Math.max(x(n-1)-x(firstReal),2), height:H-T-B,
                fill:'rgba(67,197,158,.09)', stroke:'none'}, svg);
    el('text', {x:x(firstReal)+6, y:T+13, fill:'#43c59e', 'font-size':10}, svg).textContent = 'real ERA5';
  }
  // grid
  for (let g = 0; g <= 4; g++){
    const v = maxRain * g / 4, yy = yR(v);
    el('line', {x1:L, x2:W-R, y1:yy, y2:yy, stroke:'#1b2a42', 'stroke-width':1}, svg);
    el('text', {x:L-8, y:yy+3, fill:'#7f93ad', 'font-size':10, 'text-anchor':'end'}, svg).textContent = Math.round(v);
  }
  for (let g = 0; g <= 3; g++){
    const v = wlMin + (wlMax - wlMin) * g / 3, yy = yW(v);
    el('text', {x:W-R+8, y:yy+3, fill:'#7f93ad', 'font-size':10}, svg).textContent = v.toFixed(1);
  }
  el('text', {x:L-8, y:T-4, fill:'#7f93ad', 'font-size':10, 'text-anchor':'end'}, svg).textContent = 'mm';
  el('text', {x:W-R+8, y:T-4, fill:'#7f93ad', 'font-size':10}, svg).textContent = 'm';

  // rain bars
  const bw = Math.max(1, (W - L - R) / n * 0.75);
  rain.forEach((v, i) => {
    if (v <= 0) return;
    el('rect', {x:x(i)-bw/2, y:yR(v), width:bw, height:Math.max(1,(H-B)-yR(v)),
                fill: fl[i] ? '#e76f51' : '#3d7fbf', opacity: fl[i] ? 0.95 : 0.75, rx: Math.min(1.5,bw/2)}, svg);
  });
  // alarm lines
  const alarmNames = ['Alarm 1','Alarm 2','Alarm 3'];
  c.alarms.forEach((a, k) => {
    if (a < wlMin - 1 || a > wlMax + 1) return;
    const yy = yW(a);
    el('line', {x1:L, x2:W-R, y1:yy, y2:yy, stroke:['#e9c46a','#f4a261','#e76f51'][k],
                'stroke-width':1, 'stroke-dasharray':'5 4', opacity:.8}, svg);
    el('text', {x:W-R-4, y:yy-4, fill:['#e9c46a','#f4a261','#e76f51'][k], 'font-size':9.5, 'text-anchor':'end'}, svg).textContent = alarmNames[k];
  });
  // water level line
  const d = wl.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yW(v).toFixed(1)}`).join(' ');
  el('path', {d, fill:'none', stroke:CITY_COLORS[c.name] || '#e8eef7', 'stroke-width':1.9, 'stroke-linejoin':'round'}, svg);

  // x labels
  const step = Math.max(1, Math.floor(n / 6));
  for (let i = 0; i < n; i += step){
    const dt = dates[i];
    el('text', {x:x(i), y:H-12, fill:'#7f93ad', 'font-size':10, 'text-anchor':'middle'}, svg)
      .textContent = dt.slice(0,7);
  }
  // hover
  const cross = el('line', {x1:0, x2:0, y1:T, y2:H-B, stroke:'#8ba0bd', 'stroke-width':1, opacity:0}, svg);
  const hit = el('rect', {x:L, y:T, width:W-L-R, height:H-T-B, fill:'transparent'}, svg);
  hit.addEventListener('mousemove', ev => {
    const box = svg.getBoundingClientRect();
    const px = (ev.clientX - box.left) / box.width * W;
    const i = Math.round((px - L) / (W - L - R) * (n - 1));
    if (i < 0 || i >= n) return;
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('opacity', .5);
    showTip(ev, `<b>${dates[i]}</b><br>${c.name} · ${c.station}<br>
      rain <b>${fmt(rain[i],1)}</b> mm<br>water level <b>${fmt(wl[i],2)}</b> m
      ${fl[i] ? '<br><span style="color:#ff9b82">flood proxy = 1</span>' : ''}`);
  });
  hit.addEventListener('mouseleave', () => { cross.setAttribute('opacity', 0); hideTip(); });
  document.getElementById('windowLabel').textContent = `${dates[0]} → ${dates[n-1]} · ${n} days`;
  document.getElementById('seriesLegend').innerHTML =
    `<span><i style="background:#3d7fbf"></i>rainfall</span>
     <span><i style="background:#e76f51"></i>rainfall on a flood-proxy day</span>
     <span><i style="background:${CITY_COLORS[c.name]}"></i>water level</span>
     <span>alarms ${c.alarms.join(' / ')} m</span>`;
}

/* ---------- heatmap ---------- */
function drawHeat(){
  const c = D.cities[cityIdx], h = D.heat[c.name], years = D.years;
  const svg = document.getElementById('heat'); svg.innerHTML = '';
  const W = 640, H = 300, L = 40, T = 22;
  const cw = (W - L - 8) / 12, ch = (H - T - 18) / years.length;
  months.forEach((m, j) => el('text', {x:L + cw*(j+.5), y:T-8, fill:'#7f93ad','font-size':10,'text-anchor':'middle'}, svg).textContent = m);
  const scale = [[0,'#16233a'],[150,'#1f6f8b'],[300,'#2a9d8f'],[450,'#e9c46a'],[600,'#e76f51']];
  function color(v){
    if (v == null) return '#0d1626';
    for (let i = 1; i < scale.length; i++){
      if (v <= scale[i][0]) {
        const [a,ca] = scale[i-1], [b,cb] = scale[i], t = (v-a)/(b-a);
        const pa = hex(ca), pb = hex(cb);
        return `rgb(${pa.map((x,k)=>Math.round(x+(pb[k]-x)*t)).join(',')})`;
      }
    }
    return scale[scale.length-1][1];
  }
  function hex(s){ return [1,3,5].map(i=>parseInt(s.slice(i,i+2),16)); }
  years.forEach((y, i) => {
    el('text', {x:L-8, y:T + ch*(i+.5)+3, fill:'#7f93ad','font-size':10,'text-anchor':'end'}, svg).textContent = y;
    for (let j = 0; j < 12; j++){
      const v = h[i] ? h[i][j] : null;
      const r = el('rect', {x:L + cw*j + 1, y:T + ch*i + 1, width:cw-2, height:ch-2, rx:3,
                            fill: color(v)}, svg);
      r.addEventListener('mousemove', ev => showTip(ev, `<b>${months[j]} ${y}</b><br>${c.name}<br>rainfall <b>${v == null ? '—' : fmt(v,1)+' mm'}</b>`));
      r.addEventListener('mouseleave', hideTip);
      if (v != null && v > 300 && cw > 34)
        el('text', {x:L + cw*j + cw/2, y:T + ch*i + ch/2 + 3.5, fill:'#0b1220','font-size':9,
                    'text-anchor':'middle','font-weight':600, opacity:.75}, svg).textContent = Math.round(v);
    }
  });
}

/* ---------- scatter ---------- */
function drawScatter(){
  const c = D.cities[cityIdx];
  const svg = document.getElementById('scatter'); svg.innerHTML = '';
  const W = 520, H = 320, L = 46, B = 34, T = 12, R = 10;
  const xs = c.rain, ys = c.wl;
  const xMax = Math.max(60, Math.max(...xs)) * 1.05;
  const yMin = Math.min(...ys) - .2, yMax = Math.max(...ys) + .2;
  const X = v => L + (v / xMax) * (W - L - R);
  const Y = v => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  for (let g = 0; g <= 4; g++){
    const v = xMax*g/4; const xx = X(v);
    el('line', {x1:xx, x2:xx, y1:T, y2:H-B, stroke:'#1b2a42'}, svg);
    el('text', {x:xx, y:H-14, fill:'#7f93ad','font-size':10,'text-anchor':'middle'}, svg).textContent = Math.round(v);
  }
  for (let g = 0; g <= 4; g++){
    const v = yMin + (yMax-yMin)*g/4; const yy = Y(v);
    el('line', {x1:L, x2:W-R, y1:yy, y2:yy, stroke:'#1b2a42'}, svg);
    el('text', {x:L-8, y:yy+3, fill:'#7f93ad','font-size':10,'text-anchor':'end'}, svg).textContent = v.toFixed(1);
  }
  c.alarms.forEach((a,k)=>{
    if (a < yMin || a > yMax) return;
    el('line', {x1:L, x2:W-R, y1:Y(a), y2:Y(a), stroke:['#e9c46a','#f4a261','#e76f51'][k],
                'stroke-dasharray':'4 4','stroke-width':1, opacity:.75}, svg);
  });
  el('text', {x:L-8, y:T+2, fill:'#7f93ad','font-size':10,'text-anchor':'end'}, svg).textContent = 'm';
  el('text', {x:W-R, y:H-2, fill:'#7f93ad','font-size':10,'text-anchor':'end'}, svg).textContent = 'rainfall mm/day';
  const step = Math.max(1, Math.floor(xs.length / 3500));
  for (let i = 0; i < xs.length; i += step){
    const f = c.flood[i];
    const dot = el('circle', {cx:X(xs[i]), cy:Y(ys[i]), r: f ? 3.1 : 1.7,
                   fill: f ? '#e76f51' : '#3b6fa0', opacity: f ? .95 : .5}, svg);
    dot.addEventListener('mousemove', ev => showTip(ev,
       `<b>${D.dates[i]}</b><br>${c.name}<br>rain <b>${fmt(xs[i],1)}</b> mm<br>WL <b>${fmt(ys[i],2)}</b> m${f?'<br><span style="color:#ff9b82">flood = 1</span>':''}`));
    dot.addEventListener('mouseleave', hideTip);
  }
}

/* ---------- rainfall-source coverage ---------- */
(function drawCoverage(){
  const svg = document.getElementById('covChart');
  const W = 640, H = 230, L = 42, B = 30, T = 12;
  const monthsList = D.monthly.map(m => m.Month);
  const perMonth = {};
  monthsList.forEach(m => perMonth[m] = {syn:0, real:0});
  D.cities.forEach(c => c.source.forEach((s, i) => {
    const m = D.dates[i].slice(0,7);
    if (!perMonth[m]) return;
    if (s === 'synthetic-calibrated') perMonth[m].syn += 1; else perMonth[m].real += 1;
  }));
  const maxV = Math.max(...Object.values(perMonth).map(v => v.syn + v.real));
  const bw = (W - L - 8) / monthsList.length;
  Object.entries(perMonth).forEach(([m, v], i) => {
    const hReal = (v.real / maxV) * (H - T - B);
    const hSyn = (v.syn / maxV) * (H - T - B);
    const x = L + i*bw;
    el('rect', {x:x, y:H-B-hSyn, width:Math.max(bw-.6,1), height:hSyn, fill:'#4a9df0', opacity:.75}, svg);
    el('rect', {x:x, y:H-B-hSyn-hReal, width:Math.max(bw-.6,1), height:hReal, fill:'#43c59e'}, svg);
  });
  el('text', {x:L-8, y:H-B, fill:'#7f93ad','font-size':10,'text-anchor':'end'}, svg).textContent = '0';
  el('text', {x:L-8, y:T+8, fill:'#7f93ad','font-size':10,'text-anchor':'end'}, svg).textContent = maxV;
  monthsList.forEach((m, i) => {
    if (i % 12 === 5) el('text', {x:L + i*bw + bw/2, y:H-10, fill:'#7f93ad','font-size':10,'text-anchor':'middle'}, svg)
      .textContent = m.slice(0,4);
  });
})();

/* ---------- balance ---------- */
(function drawBalance(){
  const svg = document.getElementById('balance');
  const W = 520, H = 230, L = 42, T = 14, B = 34;
  const rows = [['Low', D.stats.risk.Low, '#43c59e'], ['Moderate', D.stats.risk.Moderate, '#e9c46a'],
                ['High', D.stats.risk.High, '#f4a261'], ['Very High', D.stats.risk['Very High'], '#e76f51']];
  const maxV = Math.max(...rows.map(r => r[1]));
  const bh = (H - T - B) / rows.length;
  rows.forEach(([label, v, col], i) => {
    const w = Math.max((v / maxV) * (W - L - 90), 1.5);
    const y = T + i*bh + 6;
    el('text', {x:L-8, y:y + bh/2 - 4, fill:'#8ba0bd','font-size':10.5,'text-anchor':'end'}, svg).textContent = label;
    el('rect', {x:L, y:y, width:w, height:bh-12, rx:4, fill:col, opacity:.85}, svg);
    el('text', {x:L + w + 8, y:y + bh/2 - 3, fill:'#e8eef7','font-size':11}, svg).textContent = fmt(v,0) + ' days';
  });
  document.getElementById('splitTable').innerHTML =
    '<table><thead><tr><th>Split</th><th>Rows</th><th>Flood days</th><th>Window</th></tr></thead><tbody>' +
    D.by_split.map((s, i) => {
      const win = i === 0 ? '2016 – 2023' : i === 1 ? '2024' : '2025 – 2026';
      return `<tr><td>${s.split}</td><td class="num">${fmt(s.rows,0)}</td><td class="num">${fmt(s.floods,0)}</td><td>${win}</td></tr>`;
    }).join('') + '</tbody></table>';
})();

/* ---------- tables ---------- */
document.querySelector('#events tbody').innerHTML = D.events.map(e => `
  <tr><td>${e.Date}</td><td>${e.Location}</td><td class="num">${fmt(e.Rainfall_mm,1)}</td>
  <td class="num">${fmt(e.AntecedentRain_7d_mm,1)}</td><td class="num"><b>${fmt(e.WaterLevel_m,2)}</b></td>
  <td><span class="pill ${e.RiskLevel.replace(' ','')}">${e.RiskLevel}</span></td>
  <td style="color:${e.RainSource==='synthetic-calibrated'?'#8ba0bd':'#43c59e'}">${e.RainSource}</td></tr>`).join('');

document.querySelector('#cities tbody').innerHTML = D.by_city.map(c => {
  const city = D.cities.find(x => x.name === c.Location);
  return `<tr><td><b>${c.Location}</b></td><td style="color:#8ba0bd">${city.station}</td>
  <td class="num">${fmt(c.rows,0)}</td><td class="num">${fmt(c.rain,0)}</td>
  <td class="num">${fmt(c.wl_mean ?? 0,2)}</td><td class="num">${fmt(c.maxwl,2)}</td>
  <td class="num">${fmt(c.floods,0)}</td><td style="color:#8ba0bd">${city.alarms.join(' / ')}</td></tr>`;
}).join('');

/* ---------- init ---------- */
document.getElementById('range').onchange = drawSeries;
drawSeries(); drawHeat(); drawScatter();
</script>
</body>
</html>
"""

payload["version"] = "v2"
html = HTML.replace("__DATA__", json.dumps(payload, separators=(",", ":")))
html = html.replace("__GEN__", "2026-11-15")
target = OUT / "dataset_preview.html"
target.write_text(html, encoding="utf-8")
print(f"Wrote {target} ({target.stat().st_size/1024:.0f} KB)")
