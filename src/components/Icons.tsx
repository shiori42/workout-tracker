import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 24): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const HomeIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </svg>
);

export const TimerIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5" />
    <path d="M9 2h6" />
  </svg>
);

export const ChartIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20H2" />
  </svg>
);

export const UserIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </svg>
);

export const CalendarIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const BackIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const ChevronRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const ChevronLeft = BackIcon;

export const PlusIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CheckIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={3} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

export const XIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const GearIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const TrashIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

export const EditIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4z" />
  </svg>
);

export const CopyIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h9" />
  </svg>
);

export const CameraIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const DumbbellIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </svg>
);

export const FoodIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 21V3c-2.5 1-4 3.5-4 7v3h4" />
  </svg>
);

export const BellIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" />
    <path d="M10 21h4" />
  </svg>
);

export const UpIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);

export const DownIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const SparkIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
  </svg>
);

export const HistoryIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l3 2" />
  </svg>
);
