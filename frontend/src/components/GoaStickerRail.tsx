const stickers = [
  {
    label: "HH Goa 2026 postage stamp",
    className: "-rotate-[5deg]",
    art: (
      <div className="sticker-stamp">
        <span>HH</span>
        <span>GOA</span>
        <span>2026</span>
        <i aria-hidden="true">PALM</i>
      </div>
    ),
  },
  {
    label: "Coding scooter",
    className: "rotate-[4deg]",
    art: (
      <svg aria-hidden="true" fill="none" viewBox="0 0 96 72">
        <path d="M27 55h34l13-18H45l-9 10H18" />
        <path d="M62 37 57 18h15M69 18h9M35 30l-8-9 11-6 11 8" />
        <circle cx="25" cy="56" r="10" />
        <circle cx="70" cy="56" r="10" />
        <rect x="47" y="23" width="18" height="12" rx="2" />
        <path d="m52 29 3-3-3 3 3 3M60 26l3 3-3 3" />
      </svg>
    ),
  },
  {
    label: "Goan azulejo tile",
    className: "-rotate-[4deg]",
    art: <div className="sticker-tile" />,
  },
  {
    label: "Fishing boat",
    className: "rotate-[5deg]",
    art: (
      <svg aria-hidden="true" fill="none" viewBox="0 0 104 62">
        <path d="M11 40h80L76 55H27L11 40Z" />
        <path d="M27 40V23h40l12 17M37 23V13h18v10M67 23l9-10h9" />
        <path d="M9 59c8-5 14 5 22 0s14 5 22 0 14 5 22 0 14 5 22 0" />
        <path d="M31 32h8m7 0h8m7 0h8" />
      </svg>
    ),
  },
  {
    label: "Goa chapel arch",
    className: "-rotate-[2deg]",
    art: (
      <svg aria-hidden="true" fill="none" viewBox="0 0 72 88">
        <path d="M15 78V40c0-15 9-27 21-27s21 12 21 27v38H15Z" />
        <path d="M25 78V53c0-8 5-14 11-14s11 6 11 14v25M31 13V7h10v6M36 7V2" />
        <path d="M10 78h52M20 33h32M29 28h14" />
      </svg>
    ),
  },
] as const;

export function GoaStickerRail() {
  return (
    <aside
      aria-label="Goa sticker rail"
      className="hidden min-h-0 flex-col items-center justify-between py-2 xl:flex"
    >
      {stickers.map((sticker) => (
        <div
          aria-hidden="true"
          className={`studio-sticker grid place-items-center ${sticker.className}`}
          data-sticker
          key={sticker.label}
          title={sticker.label}
        >
          {sticker.art}
        </div>
      ))}
    </aside>
  );
}
