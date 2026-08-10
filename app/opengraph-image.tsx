import { ImageResponse } from "next/og";

export const alt = "LOOMIE — Design That Connects";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const INK = "#050507";
const PAPER = "#ffffff";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: INK,
          color: PAPER,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
        }}
      >
        {/* The mark: a pill with two apertures, same geometry as LoomieEyes. */}
        <svg width="300" height="154" viewBox="0 0 360 185">
          <rect
            x="5"
            y="5"
            width="350"
            height="175"
            rx="87.5"
            fill={PAPER}
          />
          <circle cx="113" cy="92.5" r="46" fill={INK} />
          <circle cx="247" cy="92.5" r="46" fill={INK} />
        </svg>

        <div
          style={{
            display: "flex",
            fontSize: 132,
            fontWeight: 800,
            letterSpacing: -6,
            marginTop: 56,
          }}
        >
          LOOMIE
        </div>

        <div
          style={{
            display: "flex",
            width: 420,
            height: 2,
            background: PAPER,
            marginTop: 40,
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 8,
            marginTop: 40,
          }}
        >
          DESIGN THAT CONNECTS
        </div>
      </div>
    ),
    size
  );
}
