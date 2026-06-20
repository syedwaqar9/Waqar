import { Resvg } from "@resvg/resvg-js";

// SVG string to 1080px-wide PNG buffer. Uses system fonts; DM Sans if installed,
// otherwise a system sans fallback (the in-browser preview always uses DM Sans).
export function svgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1080 },
    font: { loadSystemFonts: true },
  });
  return Buffer.from(resvg.render().asPng());
}
