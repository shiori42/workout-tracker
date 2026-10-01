import { ImageResponse } from "next/og";

const SIZES = ["180", "192", "512"];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const px = SIZES.includes(size) ? Number(size) : 192;
  const bar = px * 0.09;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ff6b2c 0%, #ffb020 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: bar, height: px * 0.3, background: "#0b0b0f", borderRadius: bar / 3 }} />
          <div style={{ width: bar * 1.3, height: px * 0.46, background: "#0b0b0f", borderRadius: bar / 3, marginLeft: bar * 0.3 }} />
          <div style={{ width: px * 0.22, height: bar, background: "#0b0b0f" }} />
          <div style={{ width: bar * 1.3, height: px * 0.46, background: "#0b0b0f", borderRadius: bar / 3 }} />
          <div style={{ width: bar, height: px * 0.3, background: "#0b0b0f", borderRadius: bar / 3, marginLeft: bar * 0.3 }} />
        </div>
      </div>
    ),
    { width: px, height: px },
  );
}
