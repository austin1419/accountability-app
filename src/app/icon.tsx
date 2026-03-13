import { ImageResponse } from "next/og";

// Generates /icon/192 and /icon/512 — referenced by manifest.ts
export function generateImageMetadata() {
  return [
    { contentType: "image/png", size: { width: 192, height: 192 }, id: "192" },
    { contentType: "image/png", size: { width: 512, height: 512 }, id: "512" },
  ];
}

export default function Icon({ id }: { id: string }) {
  const size   = id === "512" ? 512 : 192;
  const scale  = size / 512;

  // All coordinates are for a 512×512 canvas, scaled via transform
  return new ImageResponse(
    (
      <div
        style={{
          width:          size,
          height:         size,
          background:     "#0D0D0D",
          borderRadius:   Math.round(114 * scale),
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          overflow:       "hidden",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="256" cy="256" r="185" stroke="#B8933A" strokeWidth="22" fill="none" />
          <polyline
            points="86,256 156,256 178,256 200,148 222,368 242,256 250,256 256,110 262,256 270,256 290,180 312,332 334,256 356,256 426,256"
            stroke="#B8933A"
            strokeWidth="26"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
