import { NextRequest, NextResponse } from "next/server";
import { getPost } from "@/lib/store";
import { postSVGs } from "@/lib/render/svg";
import { svgToPng } from "@/lib/render/png";

// GET /api/render?weekId=..&postId=..&slide=0  -> PNG download of one asset.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekId = searchParams.get("weekId") || "";
  const postId = searchParams.get("postId") || "";
  const slide = parseInt(searchParams.get("slide") || "0", 10);

  const found = await getPost(weekId, postId);
  if (!found) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const svgs = postSVGs(found.post);
  if (!svgs.length) return NextResponse.json({ error: "No visual." }, { status: 404 });
  const svg = svgs[Math.max(0, Math.min(slide, svgs.length - 1))];

  try {
    const png = svgToPng(svg);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "content-type": "image/png",
        "content-disposition": `attachment; filename="iaims-${found.post.day.toLowerCase()}-${slide + 1}.png"`,
      },
    });
  } catch {
    // If native PNG conversion is unavailable, return the SVG instead.
    return new NextResponse(svg, {
      headers: {
        "content-type": "image/svg+xml",
        "content-disposition": `attachment; filename="iaims-${found.post.day.toLowerCase()}-${slide + 1}.svg"`,
      },
    });
  }
}
