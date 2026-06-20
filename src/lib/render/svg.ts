// LinkedIn asset renderer. Rebuilds the locked cairosvg design as native SVG.
// 1080x1080, two-colour headline split, dark/light themes, auto-fit headlines.

import { DESIGN } from "@/brand/brandBrain";
import { estimateTextWidth } from "@/lib/linter";
import type { Post, SingleVisual, Slide, SlideTheme } from "@/lib/types";

const SIZE = DESIGN.size; // 1080
const M = DESIGN.margin; // 60
const MAXW = DESIGN.usableWidth; // 960

interface Palette {
  bg: string;
  text: string;
  accent: string;
  eyebrow: string;
  muted: string;
  card: string;
  cardText: string;
  ctaFill: string;
}

function palette(theme: SlideTheme): Palette {
  if (theme === "dark") {
    return {
      bg: DESIGN.colors.nearBlack,
      text: DESIGN.colors.white,
      accent: DESIGN.colors.lightTeal,
      eyebrow: DESIGN.colors.lightTeal,
      muted: "rgba(255,255,255,0.6)",
      card: "rgba(255,255,255,0.07)",
      cardText: DESIGN.colors.white,
      ctaFill: DESIGN.colors.teal,
    };
  }
  return {
    bg: DESIGN.colors.white,
    text: DESIGN.colors.navy,
    accent: DESIGN.colors.teal,
    eyebrow: DESIGN.colors.teal,
    muted: "rgba(15,13,48,0.55)",
    card: DESIGN.colors.lightBg,
    cardText: DESIGN.colors.navy,
    ctaFill: DESIGN.colors.navy,
  };
}

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fitFont(lines: string[], maxWidth: number, start: number, min: number, bold = true): number {
  let size = start;
  const safe = lines.filter(Boolean);
  if (!safe.length) return start;
  while (size > min) {
    const widest = Math.max(...safe.map((l) => estimateTextWidth(l, size, bold)));
    if (widest <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function wrap(text: string, maxChars: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

const FONT = "DM Sans, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

function eyebrow(label: string, p: Palette, y = 120): string {
  if (!label) return "";
  return `
    <rect x="${M}" y="${y - 14}" width="34" height="6" rx="3" fill="${p.accent}"/>
    <text x="${M + 48}" y="${y}" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="3" fill="${p.eyebrow}">${esc(
    label.toUpperCase(),
  )}</text>`;
}

function brandMark(p: Palette): string {
  return `<text x="${M}" y="${SIZE - 54}" font-family="${FONT}" font-size="22" font-weight="600" letter-spacing="0.5" fill="${p.muted}">${esc(
    DESIGN.brandMark,
  )}</text>`;
}

function bottomRight(label: string, p: Palette): string {
  if (!label) return "";
  return `<text x="${SIZE - M}" y="${SIZE - 54}" text-anchor="end" font-family="${FONT}" font-size="20" font-weight="700" letter-spacing="1.5" fill="${p.muted}">${esc(
    label.toUpperCase(),
  )}</text>`;
}

function headlineBlock(
  whiteLines: string[],
  accentLines: string[],
  p: Palette,
  startY: number,
  start: number,
  min: number,
): { svg: string; endY: number } {
  const all = [...whiteLines, ...accentLines].filter(Boolean);
  const size = fitFont(all, MAXW, start, min);
  const lh = Math.round(size * 1.06);
  let y = startY + size;
  let svg = "";
  for (const line of whiteLines.filter(Boolean)) {
    svg += `<text x="${M}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="800" fill="${p.text}">${esc(
      line,
    )}</text>`;
    y += lh;
  }
  for (const line of accentLines.filter(Boolean)) {
    svg += `<text x="${M}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="800" fill="${p.accent}">${esc(
      line,
    )}</text>`;
    y += lh;
  }
  return { svg, endY: y - lh + Math.round(size * 0.2) };
}

function subheadBlock(text: string | undefined, p: Palette, startY: number, accent = true): { svg: string; endY: number } {
  if (!text) return { svg: "", endY: startY };
  const lines = wrap(text, 44).slice(0, 4);
  const size = 30;
  const lh = Math.round(size * 1.3);
  let y = startY + 40 + size;
  let svg = "";
  for (const line of lines) {
    svg += `<text x="${M}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="500" fill="${
      accent ? p.accent : p.muted
    }">${esc(line)}</text>`;
    y += lh;
  }
  return { svg, endY: y };
}

function ctaButton(text: string, p: Palette, y: number): string {
  const label = text || "";
  if (!label) return "";
  const w = Math.min(MAXW, Math.round(estimateTextWidth(label, 26, true)) + 64);
  return `
    <rect x="${M}" y="${y}" width="${w}" height="72" rx="12" fill="${p.ctaFill}"/>
    <text x="${M + w / 2}" y="${y + 47}" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="700" fill="#FFFFFF">${esc(
    label,
  )}</text>`;
}

function frame(p: Palette, inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="${p.bg}"/>
  ${inner}
</svg>`;
}

// ── Single image post ────────────────────────────────────────────────────────
export function singleSVG(v: SingleVisual): string {
  const p = palette(v.theme);
  let inner = eyebrow(v.eyebrow, p);
  const head = headlineBlock(v.headlineWhite || [], v.headlineAccent || [], p, 300, 104, 52);
  inner += head.svg;
  const sub = subheadBlock(v.subhead, p, head.endY, true);
  inner += sub.svg;
  if (v.cta) inner += ctaButton(v.cta, p, Math.min(820, sub.endY + 60));
  inner += brandMark(p);
  inner += bottomRight(v.sourceLabel || "", p);
  return frame(p, inner);
}

// ── Carousel slide ───────────────────────────────────────────────────────────
export function slideSVG(slide: Slide, total: number): string {
  const p = palette(slide.theme);
  let inner = eyebrow(slide.eyebrow || "", p);

  if (slide.layout === "grid" && slide.gridItems?.length) {
    const head = headlineBlock(slide.headlineWhite || [], slide.headlineAccent || [], p, 170, 48, 34);
    inner += head.svg;
    const items = slide.gridItems.slice(0, 6);
    const cols = 2;
    const colW = (MAXW - 40) / cols;
    const rows = Math.ceil(items.length / cols);
    const gridTop = Math.max(head.endY + 60, 360);
    const rowH = Math.min(180, (SIZE - 140 - gridTop) / rows);
    items.forEach((it, i) => {
      const cx = M + (i % cols) * (colW + 40);
      const cy = gridTop + Math.floor(i / cols) * rowH;
      inner += `<rect x="${cx}" y="${cy}" width="${colW}" height="${rowH - 20}" rx="14" fill="${p.card}"/>`;
      inner += `<text x="${cx + 28}" y="${cy + 50}" font-family="${FONT}" font-size="26" font-weight="800" fill="${p.cardText}">${esc(
        it.label,
      )}</text>`;
      const cap = wrap(it.caption || "", 30).slice(0, 2);
      cap.forEach((line, li) => {
        inner += `<text x="${cx + 28}" y="${cy + 86 + li * 28}" font-family="${FONT}" font-size="20" font-weight="500" fill="${p.muted}">${esc(
          line,
        )}</text>`;
      });
    });
  } else if (slide.layout === "compare" && slide.compareRows?.length) {
    const head = headlineBlock(slide.headlineWhite || [], slide.headlineAccent || [], p, 170, 48, 34);
    inner += head.svg;
    const top = Math.max(head.endY + 50, 340);
    const colW = (MAXW - 40) / 2;
    inner += `<text x="${M}" y="${top}" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="1" fill="${p.accent}">${esc(
      (slide.compareTitleLeft || "EVIDENCE YOU NEED").toUpperCase(),
    )}</text>`;
    inner += `<text x="${M + colW + 40}" y="${top}" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="1" fill="${p.muted}">${esc(
      (slide.compareTitleRight || "WHAT MOST TEAMS HAVE").toUpperCase(),
    )}</text>`;
    slide.compareRows.slice(0, 4).forEach((r, i) => {
      const ry = top + 50 + i * 130;
      inner += `<rect x="${M}" y="${ry}" width="${colW}" height="110" rx="12" fill="${p.card}"/>`;
      wrap(r.left, 26).slice(0, 3).forEach((line, li) => {
        inner += `<text x="${M + 22}" y="${ry + 40 + li * 28}" font-family="${FONT}" font-size="21" font-weight="600" fill="${p.cardText}">${esc(
          line,
        )}</text>`;
      });
      inner += `<rect x="${M + colW + 40}" y="${ry}" width="${colW}" height="110" rx="12" fill="${p.ctaFill}"/>`;
      wrap(r.right, 26).slice(0, 3).forEach((line, li) => {
        inner += `<text x="${M + colW + 62}" y="${ry + 40 + li * 28}" font-family="${FONT}" font-size="21" font-weight="600" fill="#FFFFFF">${esc(
          line,
        )}</text>`;
      });
    });
  } else if (slide.layout === "list" && slide.bullets?.length) {
    const head = headlineBlock(slide.headlineWhite || [], slide.headlineAccent || [], p, 170, 48, 34);
    inner += head.svg;
    const top = Math.max(head.endY + 50, 360);
    slide.bullets.slice(0, 5).forEach((b, i) => {
      const by = top + i * 110;
      inner += `<text x="${M}" y="${by + 34}" font-family="${FONT}" font-size="34" font-weight="800" fill="${p.accent}">${String(
        i + 1,
      ).padStart(2, "0")}</text>`;
      wrap(b, 40).slice(0, 2).forEach((line, li) => {
        inner += `<text x="${M + 80}" y="${by + 28 + li * 34}" font-family="${FONT}" font-size="27" font-weight="600" fill="${p.text}">${esc(
          line,
        )}</text>`;
      });
    });
  } else if (slide.layout === "takeaway") {
    const head = headlineBlock(slide.headlineWhite || [], slide.headlineAccent || [], p, 300, 72, 40);
    inner += head.svg;
    const sub = subheadBlock(slide.subhead, p, head.endY, false);
    inner += sub.svg;
    inner += ctaButton(slide.cta || "Follow along at iaimscience.org", p, Math.min(840, sub.endY + 50));
  } else {
    // hook or statement
    const start = slide.layout === "hook" ? 76 : 64;
    const head = headlineBlock(slide.headlineWhite || [], slide.headlineAccent || [], p, 280, start, 40);
    inner += head.svg;
    const sub = subheadBlock(slide.subhead, p, head.endY, true);
    inner += sub.svg;
    if (slide.layout === "hook") inner += ctaButton(slide.cta || "Swipe for the breakdown", p, Math.min(840, sub.endY + 50));
  }

  inner += brandMark(p);
  inner += bottomRight(slide.sourceLabel || `${slide.index} / ${total}`, p);
  return frame(p, inner);
}

// All SVGs for a post (single = 1, carousel = N).
export function postSVGs(post: Post): string[] {
  if (post.format === "single" && post.single) return [singleSVG(post.single)];
  if (post.format === "carousel" && post.slides) {
    return post.slides.map((s) => slideSVG(s, post.slides!.length));
  }
  return [];
}
