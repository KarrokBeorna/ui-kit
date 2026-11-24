// iconsExtra.tsx — иконки проектов, вынесенные из Maintenance Service,
// плюс общие иконки (фотографии). Единый API с icons.tsx: s / size + SVG-пропсы.
import React, { useId, type SVGProps } from 'react';
import type { IconProps } from './icons';

/** Авто-журнал: список с монограммой «A» (вырез маской). */
export const AutoJournalIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 15;
  const maskId = useId();
  return (
    <svg width={d} height={d} viewBox="0 0 15 15" fill="none" aria-hidden="true" {...p}>
      <defs>
        <mask id={maskId}>
          <rect width="15" height="15" fill="white" />
          <text x="0" y="14.5" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="900"
            fill="black" stroke="black" strokeWidth="1.5" strokeLinejoin="round">A</text>
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="2.3" y1="3" x2="6.2" y2="3" /><line x1="8.8" y1="3" x2="12.7" y2="3" />
        <line x1="2.3" y1="7.5" x2="6.2" y2="7.5" /><line x1="8.8" y1="7.5" x2="12.7" y2="7.5" />
        <line x1="2.3" y1="12" x2="6.2" y2="12" /><line x1="8.8" y1="12" x2="12.7" y2="12" />
      </g>
      <text x="0" y="14.5" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="900"
        fill="currentColor">A</text>
    </svg>
  );
};

/** Константы: шестерёнка-лучи. */
export const ConstantsIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v3" /><path d="M12 20v3" />
      <path d="M4.22 4.22l2.12 2.12" /><path d="M17.66 17.66l2.12 2.12" />
      <path d="M1 12h3" /><path d="M20 12h3" />
      <path d="M4.22 19.78l2.12-2.12" /><path d="M17.66 6.34l2.12-2.12" />
    </svg>
  );
};

/** Шаблоны графика: календарь с карандашом. */
export const ShiftTemplatesIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M15 14l-2 2 4 4 2-2-4-4z" /><line x1="13" y1="16" x2="17" y2="20" />
    </svg>
  );
};

/** Рабочий календарь: календарь с галочкой. */
export const WorkCalendarIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="12 15 14 17 19 11" />
    </svg>
  );
};

/** Герметик: капля. */
export const SealantIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 2.7s6.5 7 6.5 12a6.5 6.5 0 0 1-13 0c0-5 6.5-12 6.5-12z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </svg>
  );
};

/** Фотографии: стопка снимков (действие в ActionsColumn). */
export const PhotosIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 16;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="7" y="7" width="14" height="14" rx="2" />
      <path d="M3 17V5a2 2 0 0 1 2-2h12" />
      <circle cx="11.5" cy="11.5" r="1.5" />
      <path d="M21 17l-4-4-6 6" />
    </svg>
  );
};

/** Логотип Maintenance Service: перекрещенные ключ и отвёртка. */
export const WrenchScrewdriverIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 24;
  return (
    <svg width={d} height={d} viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" {...p}>
      <g transform="translate(256, 256) rotate(45) translate(-256, -256)">
        <path fillRule="evenodd" d="
          M 216 280 L 216 480 C 216 520, 296 520, 296 480 L 296 280 Z
          M 256 450 A 16 16 0 1 0 256 482 A 16 16 0 1 0 256 450 Z
          M 216 232 L 216 165 L 190 125 C 180 105, 180 35, 190 15
          C 195 7, 205 5, 210 5 C 215 5, 220 5, 221 15 L 221 75
          C 222 83, 229 85, 230 85 L 282 85 C 283 85, 290 83, 291 75 L 291 15
          C 292 5, 299 5, 302 5 C 307 5, 317 7, 322 15 C 332 35, 332 105, 322 125
          L 296 165 L 296 232 Z" />
      </g>
      <g transform="translate(256, 256) rotate(-45) translate(-256, -256)">
        <path d="
          M 234 5 L 278 5 L 278 65 C 276 72, 270 74, 268 75 L 268 306 L 303 306
          C 323 309, 323 333, 300 336 L 300 485 C 290 515, 222 515, 209 485
          L 209 336 C 186 333, 186 309, 206 306 L 244 306 L 244 75
          C 242 74, 236 72, 234 65 Z" />
      </g>
    </svg>
  );
};

export type { IconProps };
export type MaintenanceIconProps = Omit<SVGProps<SVGSVGElement>, 'size'> & { s?: number; size?: number };