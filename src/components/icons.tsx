// icons.tsx — SVG-иконки UI Kit.
// Все иконки принимают s (размер, px), size (алиас s) и любые SVG-пропсы.
// Предметные иконки всех проектов живут здесь (AGM, Rolis).
import React, { type SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'size'> & {
  /** Размер в px. */
  s?: number;
  /** Алиас s. */
  size?: number;
};

export const IcoChevronLeft = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 16;
  return (
    <svg width={d} height={d} viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const IcoChevronRight = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 16;
  return (
    <svg width={d} height={d} viewBox="0 0 16 16" fill="none" {...p}>
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** Шеврон вниз; open поворачивает на 180°. */
export const IcoChevronDown = ({ s, size, open = false, style, ...p }: IconProps & { open?: boolean }) => {
  const d = s ?? size ?? 14;
  return (
    <svg width={d} height={d} viewBox="0 0 14 14" fill="none" {...p}
      style={{ transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)', transform: open ? 'rotate(180deg)' : 'none', ...style }}>
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const IcoChevronUp = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 14;
  return (
    <svg width={d} height={d} viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M12 10L8 5l-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const IcoLogIn = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 16;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points="10,17 15,12 10,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export const IcoLogOut = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 16;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export const IcoFilter = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 15;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" {...p}>
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const IcoSearch = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 14;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export const IcoX = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 12;
  return (
    <svg width={d} height={d} viewBox="0 0 12 12" fill="none" {...p}>
      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

/** Глаз; off — перечёркнутый (скрытый пароль). */
export const IcoEye = ({ s, size, off = false, ...p }: IconProps & { off?: boolean }) => {
  const d = s ?? size ?? 16;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" {...p}>
      {off ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
};

export const ExportIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 14;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="9" y1="13" x2="15" y2="19" /><line x1="15" y1="13" x2="9" y2="19" />
    </svg>
  );
};

export const IcoCheck = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 12;
  return (
    <svg width={d} height={d} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 6l3 3 5-5" />
    </svg>
  );
};

export const IcoArrowUp = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 12;
  return (
    <svg width={d} height={d} viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 9l4-4 4 4" />
    </svg>
  );
};

export const IcoArrowDown = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 12;
  return (
    <svg width={d} height={d} viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 3l4 4 4-4" />
    </svg>
  );
};

export const CalendarIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 16;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
};

export const ClockIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 16;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
};

export const DateTimeIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 16;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="3" width="13" height="13" rx="1.5" />
      <line x1="7" y1="2" x2="7" y2="6" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="3" y1="9" x2="16" y2="9" />
      <circle cx="19" cy="19" r="4" />
      <polyline points="19 17 19 19 21 19" />
    </svg>
  );
};

/** Иконка файла: type = 'file' | 'image' | 'pdf'. */
export const IcoFile = ({ s, size, type = 'file', ...p }: IconProps & { type?: 'file' | 'image' | 'pdf' }) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      {type === 'image' ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </>
      ) : (
        <>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
          {type === 'pdf' && <path d="M10 13h4M10 17h4M10 9h1" />}
        </>
      )}
    </svg>
  );
};

export const IcoHorHeader = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 14;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" {...p}>
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export const IcoVerHeader = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 14;
  return (
    <svg width={d} height={d} viewBox="0 0 14 14" fill="none" {...p}>
      <rect x="1" y="1" width="4" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7" y="1" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7" y="8" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
};

/* ───────────────────────── Предметные иконки ───────────────────────── */

/** Главная / дашборд. */
export const HomeIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M3 9.5l9-7 9 7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
};

/** Сотрудники — два человека. */
export const EmployeesIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="9" cy="7.5" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <circle cx="17" cy="6.5" r="2.5" />
      <path d="M16 11.5c2.8.2 5 2.3 5 5" />
    </svg>
  );
};

/** Пользователь учётной записи — один человек. */
export const UserIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
};

/** Подразделения — орг-структура. */
export const DepartmentsIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="9" y="2" width="6" height="5" rx="1" />
      <rect x="2" y="17" width="6" height="5" rx="1" />
      <rect x="16" y="17" width="6" height="5" rx="1" />
      <path d="M12 7v5M5 12h14M5 12v5M19 12v5" />
    </svg>
  );
};

/** Статистика — столбцы разной высоты. */
export const StatsIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <line x1="6" y1="20" x2="6" y2="15" />
      <line x1="12" y1="20" x2="12" y2="9" />
      <line x1="18" y1="20" x2="18" y2="4" />
    </svg>
  );
};

/** Роли и доступ — щит с галочкой. */
export const ShieldIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 11.5l2.2 2.2 4.3-4.2" />
    </svg>
  );
};

/** Подписки — конверт (email-уведомления по контейнерам). Rolis. */
export const SubscriptionsIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
};

/** Настройки — шестерёнка. Rolis. */
export const SettingsIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
};

/* ───────────────────────── Логотипы ───────────────────────── */

/** AGM — промышленный корпус с двумя «пилами» и трубой. */
export const AGMIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M3 21V11l6-3v3l6-3v13" />
      <path d="M15 21V8l3-1.5v3l3-1.5v13" />
      <path d="M2 21h20" />
      <path d="M6 14v2M6 18v2M10 14v2M10 18v2M18 15v2M18 19v2" />
    </svg>
  );
};

/** Альтернатива AGM — монограмма «A». */
export const AGMMonogram = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <path d="M4 20L12 4l8 16" />
      <path d="M7.5 14h9" />
    </svg>
  );
};

/** Rolis — морской контейнер с рёбрами жёсткости (логотип сервиса). */
export const RolisIcon = ({ s, size, ...p }: IconProps) => {
  const d = s ?? size ?? 20;
  return (
    <svg width={d} height={d} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
      <rect x="2" y="5" width="20" height="13" rx="1.5" />
      <path d="M6 8v7M10 8v7M14 8v7M18 8v7" />
      <path d="M2 21h20" />
    </svg>
  );
};