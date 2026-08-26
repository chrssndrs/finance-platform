import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BALKEN = [
  { links: 6, breedte: 34, boven: 90, kleur: "#6FA828" },
  { links: 34, breedte: 28, boven: 68, kleur: "#F4A72B" },
  { links: 56, breedte: 39, boven: 17, kleur: "#3FA9DC" },
  { links: 90, breedte: 39, boven: 45, kleur: "#C0398B" },
  { links: 124, breedte: 34, boven: 73, kleur: "#1E6FA8" },
  { links: 152, breedte: 22, boven: 96, kleur: "#2E86C1" },
];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#fcfcfb",
          position: "relative",
        }}
      >
        {BALKEN.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.links,
              top: b.boven,
              width: b.breedte,
              height: 180 - b.boven - 6,
              borderRadius: 8,
              background: b.kleur,
            }}
          />
        ))}
      </div>
    ),
    { ...size }
  );
}
