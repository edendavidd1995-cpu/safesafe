'use client';
import { useEffect, useState } from 'react';

// Owner preview tool: try each colour palette on the real site. ?palette=<id> also works.
const PALETTES = [["classic", "כספת קלאסית", ["#F3EFE6", "#0E5A47", "#E04A2B", "#15171B"]], ["med", "ים תיכון", ["#FFFFFF", "#0B5FA5", "#FF6B4A", "#0B2540"]], ["night", "לילה בכספת", ["#0E1116", "#E8B34B", "#3DDC97", "#F1ECE2"]], ["desert", "שקיעה במדבר", ["#FFF6EC", "#C2502D", "#3A1E3B", "#2E1A2F"]], ["fintech", "פינטק נקי", ["#FFFFFF", "#5B3DF5", "#19C39B", "#0F1222"]], ["olive", "זית וחול", ["#EFE8D8", "#4E5B31", "#B5651D", "#1F2416"]], ["reef", "שונית באילת", ["#FBF8F3", "#0F6E73", "#FF7F50", "#0C2B33"]], ["taxi", "שחור-לבן וצהוב", ["#FFFFFF", "#0A0A0A", "#E0B800", "#0A0A0A"]], ["bordeaux", "בורדו יוקרתי", ["#FAF6F0", "#6D1A36", "#C08A6A", "#2A1018"]], ["navy", "כחול לילה ואפרסק", ["#F7F7FB", "#14213D", "#F07A52", "#14213D"]], ["forest", "יער בלילה", ["#0F2A22", "#9BE7C4", "#F2C14E", "#F2EFE4"]], ["pastel", "פסטל רך", ["#F7F5FF", "#4338CA", "#EC4899", "#1E1B4B"]]];

export function PalettePicker() {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState('classic');
  useEffect(() => {
    let p = new URLSearchParams(location.search).get('palette');
    if (!p) { try { p = localStorage.getItem('ss-palette'); } catch (e) {} }
    if (p && PALETTES.some(x => x[0] === p)) apply(p);
  }, []);
  const apply = id => {
    setCur(id);
    if (id === 'classic') delete document.documentElement.dataset.palette; else document.documentElement.dataset.palette = id;
    try { localStorage.setItem('ss-palette', id); } catch (e) {}
  };
  const i = PALETTES.findIndex(x => x[0] === cur);
  const step = d => apply(PALETTES[(i + d + PALETTES.length) % PALETTES.length][0]);
  const dots = c => <i aria-hidden="true">{c.map((x, j) => <span key={j} style={{ background: x }} />)}</i>;
  return <>
    {open && <div className="pal" role="dialog" aria-label="צבעי האתר">
      <h4>צבעי האתר <small>תצוגה מקדימה · רק אצלך</small></h4>
      <div className="pal-grid">{PALETTES.map(([id, name, c], n) => <button key={id} aria-pressed={cur === id} onClick={() => apply(id)}>{dots(c)}{n + 1}. {name}</button>)}</div>
      <div className="pal-nav"><button className="btn ghost sm" onClick={() => step(1)}>הבא →</button><button className="btn ghost sm" onClick={() => step(-1)}>← הקודם</button></div>
    </div>}
    <button className="pal-btn" onClick={() => setOpen(!open)} aria-expanded={open}>{dots(PALETTES[Math.max(0, i)][2])}{open ? 'סגירה' : `צבעים: ${PALETTES[Math.max(0, i)][1]}`}</button>
  </>;
}
