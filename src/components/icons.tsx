import React, {SVGProps, useId, useRef, useState} from 'react';

type IconProps = SVGProps<SVGSVGElement> & { s?: number };

export const IcoChevronLeft = ({ s = 16, ...props }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" {...props}>
    <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IcoChevronRight = ({ s = 16, ...props }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" {...props}>
    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IcoChevronDown = ({ s = 14, open = false, ...props }: IconProps & { open?: boolean }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 14 14"
    fill="none"
    style={{
      transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
      transform: open ? "rotate(180deg)" : "none",
      ...(props.style as React.CSSProperties),
    }}
    {...props}
  >
    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IcoLogIn = ({ s = 16, ...props }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <polyline points="10,17 15,12 10,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IcoLogOut = ({ s = 16, ...props }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IcoFilter = ({ s = 15, ...props }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" {...props}>
    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IcoSearch = ({ s = 14, ...props }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IcoX = ({ s = 12, ...props }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 12 12" fill="none" {...props}>
    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const IcoEye = ({ s = 16, off = false, ...props }: IconProps & { off?: boolean }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" {...props}>
    {off ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      </>
    )}
  </svg>
);

export const ExportIcon = ({ s = 12, ...props }: IconProps) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <line x1="9" y1="13" x2="15" y2="19" /><line x1="15" y1="13" x2="9" y2="19" />
  </svg>
);

export const IcoCheck = ({ s = 12, ...props }: IconProps) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 6l3 3 5-5" />
  </svg>
);

export const IcoArrowUp = ({ s = 12, ...props }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 9l4-4 4 4" />
  </svg>
);

export const IcoArrowDown = ({ s = 12, ...props }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 9l4 4 4-4" />
  </svg>
);

export const CalendarIcon = ({ s = 12, ...props }: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const ClockIcon = ({ s = 12, ...props }: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const DateTimeIcon = ({ s = 12, ...props }: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="13" height="13" rx="1.5" />
    <line x1="7" y1="2" x2="7" y2="6" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="3" y1="9" x2="16" y2="9" />
    <circle cx="19" cy="19" r="4" />
    <polyline points="19 17 19 19 21 19" />
  </svg>
);

export const IcoFile = ({ s = 20, type = 'file', ...props }: IconProps & { type?: 'file' | 'image' | 'pdf' }) => {
  const isImage = type === 'image';
  const isPdf = type === 'pdf';
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {isImage ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </>
      ) : isPdf ? (
        <>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M10 13h4M10 17h4M10 9h1" />
        </>
      ) : (
        <>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
        </>
      )}
    </svg>
  );
};

export const IcoHorHeader = ({ s = 14, ...props }: IconProps) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" {...props}>
    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IcoVerHeader = ({ s = 14, ...props }: IconProps) => (
  <svg width={s} height={s} viewBox="0 0 14 14" fill="none" {...props}>
    <rect x="1" y="1" width="4" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <rect x="7" y="1" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
    <rect x="7" y="8" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
);