import type { OperationalSystem } from "../../twinData";

// Oyi Twin Engine — engineering-layer iconography (Phase 16A §11). Small,
// consistent-stroke line-art SVGs, one per system plus "architecture" —
// engineering layers must communicate via icon + semantic colour together,
// never colour alone (accessibility requirement in the brief). Building-
// agnostic: takes a system key and a colour, knows nothing about Luna.

export type IconKey = OperationalSystem | "architecture" | "all";

const STROKE = 1.6;

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const GLYPHS: Record<IconKey, React.ReactNode> = {
  architecture: (
    <Svg>
      <path d="M4 21V10l8-6 8 6v11" />
      <path d="M9 21v-7h6v7" />
    </Svg>
  ),
  all: (
    <Svg>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </Svg>
  ),
  structure: (
    <Svg>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 10h16M4 16h16M10 4v16M16 4v16" />
    </Svg>
  ),
  electrical: (
    <Svg>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </Svg>
  ),
  water: (
    <Svg>
      <path d="M12 3s6 7 6 11.5A6 6 0 0 1 6 14.5C6 10 12 3 12 3Z" />
    </Svg>
  ),
  drainage: (
    <Svg>
      <path d="M6 4v6a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4" />
      <path d="M12 16v5M9 21h6" />
    </Svg>
  ),
  fire: (
    <Svg>
      <path d="M12 22c4 0 6-2.5 6-6 0-3-2-4.5-3-7-.5 2-1.5 3-2.5 2 .5-3-1-5.5-3-7 .5 3-1.5 5-3 7.5C5 13 5 14 5 16c0 3.5 3 6 7 6Z" />
    </Svg>
  ),
  hvac: (
    <Svg>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M4.2 7.8l2.6 1.5M17.2 14.7l2.6 1.5M4.2 16.2l2.6-1.5M17.2 9.3l2.6-1.5" />
    </Svg>
  ),
  "vertical-transport": (
    <Svg>
      <rect x="6" y="3" width="12" height="18" rx="1" />
      <path d="m10 8 2-2 2 2M10 16l2 2 2-2" />
    </Svg>
  ),
  security: (
    <Svg>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
    </Svg>
  ),
  access: (
    <Svg>
      <rect x="5" y="10" width="14" height="10" rx="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  ),
  "network-edge": (
    <Svg>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M12 7v6M12 13 5 17M12 13l7 4" />
    </Svg>
  ),
  "apartment-devices": (
    <Svg>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </Svg>
  ),
};

export function SystemIcon({ system, color }: { system: IconKey; color: string }) {
  return <span style={{ display: "inline-flex", color, flexShrink: 0 }}>{GLYPHS[system]}</span>;
}
