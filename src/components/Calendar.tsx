import React, { useState } from 'react';
import type { Theme } from '../themes/theme';
import DateTimePicker from './inputs/DateTimePicker';
import SearchableSelect from './inputs/SearchableSelect';
import Button from './inputs/Button';
import { useResponsive } from '../context/ResponsiveContext';

export interface TemplateOption {
  value: string;
  label: string;
  color?: string;
  backgroundColor?: string;
}

/** Опция смены (A/B/C/…), принимается календарём через пропс. */
export interface ShiftOption {
  value: string;
  label: string;
  color?: string;
  backgroundColor?: string;
}

/** Назначение на один день: шаблон + три смены. */
export interface CalendarAssignment {
  shift_template_id: string | null;
  day_shift: string | null;
  evening_shift: string | null;
  night_shift: string | null;
}

export const DEFAULT_SHIFT_OPTIONS: ShiftOption[] = [
  { value: 'A', label: 'Смена A', color: '#3498db', backgroundColor: 'rgba(52,152,219,0.25)' },
  { value: 'B', label: 'Смена B', color: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.25)' },
  { value: 'C', label: 'Смена C', color: '#2ecc71', backgroundColor: 'rgba(46,204,113,0.25)' },
];

const EMPTY_ASSIGNMENT: CalendarAssignment = {
  shift_template_id: null,
  day_shift: null,
  evening_shift: null,
  night_shift: null,
};

interface DayInfo {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
  assignment?: CalendarAssignment;
}

interface CalendarProps {
  theme: Theme;
  templateOptions: TemplateOption[];
  /** Массив смен, принимаемый через пропс. По умолчанию A/B/C. */
  shiftOptions?: ShiftOption[];
  assignments: Record<string, CalendarAssignment>;
  onAssignmentsChange?: (assignments: Record<string, CalendarAssignment>) => void;
}

function formatLocalDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseLocalDate(dateStr: string): { year: number; month: number; day: number } | null {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getMondayBasedDay(day: number): number {
  return day === 0 ? 6 : day - 1;
}

/** Итерирует по диапазону дат включительно, вызывая cb для каждой даты. */
function forEachDateInRange(
  start: string,
  end: string,
  cb: (dateStr: string) => void,
): void {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  if (!s || !e) return;

  const cur = { ...s };
  // защита от бесконечного цикла
  for (let guard = 0; guard < 20_000; guard++) {
    cb(formatLocalDate(cur.year, cur.month, cur.day));
    if (cur.year === e.year && cur.month === e.month && cur.day === e.day) return;
    const n = new Date(cur.year, cur.month, cur.day + 1);
    cur.year = n.getFullYear();
    cur.month = n.getMonth();
    cur.day = n.getDate();
  }
}

export default function Calendar({
  theme: t,
  templateOptions,
  shiftOptions = DEFAULT_SHIFT_OPTIONS,
  assignments,
  onAssignmentsChange,
}: CalendarProps) {
  const { isMobile } = useResponsive();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(
    templateOptions.length > 0 ? templateOptions[0].value : '',
  );
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  // ─── Состояние блока «Назначение смен» ───
  const [selectedShift, setSelectedShift] = useState(
    shiftOptions.length > 0 ? shiftOptions[0].value : '',
  );
  const [applyDay, setApplyDay] = useState(true);
  const [applyEvening, setApplyEvening] = useState(true);
  const [applyNight, setApplyNight] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getMondayBasedDay(getFirstDayOfMonth(year, month));

  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    resetRange();
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    resetRange();
  };

  const resetRange = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setStartDate('');
    setEndDate('');
  };

  // ─── Назначение шаблона (сохраняет уже назначенные смены) ───
  const applyOrRemoveAssignments = (start: string, end: string, template: string) => {
    const next = { ...assignments };

    forEachDateInRange(start, end, (dateStr) => {
      if (template) {
        const prev = next[dateStr];
        next[dateStr] = {
          shift_template_id: template,
          day_shift:     prev?.day_shift     ?? null,
          evening_shift: prev?.evening_shift ?? null,
          night_shift:   prev?.night_shift   ?? null,
        };
      } else {
        delete next[dateStr];
      }
    });

    onAssignmentsChange?.(next);
  };

  // ─── Множественное назначение смен A/B/C на диапазон ───
  const applyShiftAssignment = () => {
    if (!startDate || !endDate || !selectedShift) return;
    if (!applyDay && !applyEvening && !applyNight) return;

    const next = { ...assignments };

    forEachDateInRange(startDate, endDate, (dateStr) => {
      const prev = next[dateStr] ?? { ...EMPTY_ASSIGNMENT };
      next[dateStr] = {
        ...prev,
        day_shift:     applyDay     ? selectedShift : prev.day_shift,
        evening_shift: applyEvening ? selectedShift : prev.evening_shift,
        night_shift:   applyNight   ? selectedShift : prev.night_shift,
      };
    });

    onAssignmentsChange?.(next);
    resetRange();
  };

  const handleDateClick = (dateStr: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;

    if (rangeStart !== null && rangeEnd !== null) {
      resetRange();
      return;
    }

    if (rangeStart === null) {
      setRangeStart(dateStr);
      setStartDate(dateStr);
      setRangeEnd(null);
      setEndDate('');
      return;
    }

    if (rangeEnd === null) {
      const startParsed = parseLocalDate(rangeStart);
      const endParsed = parseLocalDate(dateStr);
      if (!startParsed || !endParsed) return;

      const startTime = new Date(startParsed.year, startParsed.month, startParsed.day).getTime();
      const endTime = new Date(endParsed.year, endParsed.month, endParsed.day).getTime();

      if (endTime < startTime) {
        // клик в прошлое — разворачиваем диапазон
        setRangeStart(dateStr);
        setRangeEnd(rangeStart);
        setStartDate(dateStr);
        setEndDate(rangeStart);
        if (selectedTemplate) {
          applyOrRemoveAssignments(dateStr, rangeStart, selectedTemplate);
        }
        return;
      }

      setRangeEnd(dateStr);
      setEndDate(dateStr);
      if (selectedTemplate) {
        applyOrRemoveAssignments(rangeStart, dateStr, selectedTemplate);
      }
    }
  };

  const handleApplyTemplate = () => {
    if (!startDate || !endDate) return;
    applyOrRemoveAssignments(startDate, endDate, selectedTemplate);
    resetRange();
  };

  const days: DayInfo[] = [];
  for (let i = 0; i < totalCells; i++) {
    let day: number;
    let dateStr: string;
    let monthForDate: number;
    let yearForDate: number;
    if (i < firstDayIndex) {
      const dayOffset = firstDayIndex - i;
      day = daysInPrevMonth - dayOffset + 1;
      monthForDate = prevMonth;
      yearForDate = prevMonthYear;
    } else if (i >= firstDayIndex + daysInMonth) {
      const dayOffset = i - (firstDayIndex + daysInMonth) + 1;
      day = dayOffset;
      monthForDate = month === 11 ? 0 : month + 1;
      yearForDate = month === 11 ? year + 1 : year;
    } else {
      day = i - firstDayIndex + 1;
      monthForDate = month;
      yearForDate = year;
    }
    dateStr = formatLocalDate(yearForDate, monthForDate, day);
    const isCurrentMonth = monthForDate === month && yearForDate === year;
    const assignment = assignments[dateStr];
    days.push({ day, dateStr, isCurrentMonth, assignment });
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getTemplateLabel = (value: string) => {
    const found = templateOptions.find((o) => o.value === value);
    return found ? found.label : value;
  };

  const getTemplate = (value: string | null) =>
    value ? templateOptions.find((o) => o.value === value) : undefined;

  const isDateInRange = (dateStr: string) => {
    if (!rangeStart || !rangeEnd) return false;
    const start = parseLocalDate(rangeStart);
    const end = parseLocalDate(rangeEnd);
    const current = parseLocalDate(dateStr);
    if (!start || !end || !current) return false;
    const startTime = new Date(start.year, start.month, start.day).getTime();
    const endTime = new Date(end.year, end.month, end.day).getTime();
    const currentTime = new Date(current.year, current.month, current.day).getTime();
    return currentTime >= startTime && currentTime <= endTime;
  };

  const cellWidth = '14.285%';

  const navBtn: React.CSSProperties = {
    background: 'transparent',
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    padding: isMobile ? '8px 12px' : '4px 12px',
    minWidth: isMobile ? 40 : undefined,
    minHeight: isMobile ? 40 : undefined,
    cursor: 'pointer',
    color: t.text,
    fontSize: 14,
  };

  /** Маленький бейдж «ДA», «ВB», «НC» с цветом соответствующей смены. */
  const ShiftBadge: React.FC<{ kind: 'Д' | 'В' | 'Н'; value: string }> = ({ kind, value }) => {
    const opt = shiftOptions.find((o) => o.value === value);
    return (
      <span
        title={`${kind === 'Д' ? 'Дневная' : kind === 'В' ? 'Вечерняя' : 'Ночная'} смена: ${opt?.label ?? value}`}
        style={{
          display: 'inline-block',
          background: opt?.backgroundColor ?? 'rgba(0,0,0,0.15)',
          color: opt?.color ?? 'inherit',
          padding: '0 3px',
          borderRadius: 3,
          fontWeight: 700,
          fontSize: 9,
          lineHeight: '14px',
          whiteSpace: 'nowrap',
        }}
      >
        {kind}{value}
      </span>
    );
  };

  const hasAnyShift = (a?: CalendarAssignment) =>
    !!a && (!!a.day_shift || !!a.evening_shift || !!a.night_shift);

  return (
    <div
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: isMobile ? 12 : 20,
        background: t.bgSurface,
        color: t.text,
      }}
    >
      {/* ───── Заголовок ───── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 600 }}>
          {new Date(year, month).toLocaleString('ru', { month: 'long', year: 'numeric' })}
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handlePrevMonth} style={navBtn}>◀</button>
          <button onClick={handleNextMonth} style={navBtn}>▶</button>
        </div>
      </div>

      {/* ───── Сетка дней ───── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {weekDays.map((day) => (
              <th
                key={day}
                style={{
                  padding: isMobile ? '6px 0' : '8px 0',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: isMobile ? 12 : 14,
                  color: t.placeholder,
                  borderBottom: `1px solid ${t.border}`,
                  width: cellWidth,
                }}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(totalCells / 7) }).map((_, rowIndex) => {
            const rowDays = days.slice(rowIndex * 7, (rowIndex + 1) * 7);
            return (
              <tr key={rowIndex}>
                {rowDays.map((dayInfo, colIndex) => {
                  const { day, dateStr, isCurrentMonth, assignment } = dayInfo;
                  const isWeekend = colIndex === 5 || colIndex === 6;
                  const template = getTemplate(assignment?.shift_template_id ?? null);
                  const bgColor = template?.backgroundColor
                    ? template.backgroundColor
                    : template?.color
                    ? `${template.color}40`
                    : 'rgba(46, 204, 113, 0.25)';
                  const textColor = template?.color || '#27ae60';
                  const inRange = isDateInRange(dateStr);
                  const hasTemplate = !!assignment?.shift_template_id;
                  const hasShifts = hasAnyShift(assignment);

                  return (
                    <td
                      key={dateStr}
                      onClick={() => handleDateClick(dateStr, isCurrentMonth)}
                      style={{
                        padding: isMobile ? '8px 2px' : '6px 4px',
                        textAlign: 'center',
                        verticalAlign: 'top',
                        fontSize: isMobile ? 13 : 14,
                        color: isCurrentMonth ? t.text : t.placeholder,
                        background: hasTemplate
                          ? bgColor
                          : isCurrentMonth && inRange
                          ? t.accentGlow
                          : isWeekend
                          ? t.bg
                          : 'transparent',
                        borderRadius: 6,
                        cursor: isCurrentMonth ? 'pointer' : 'default',
                        width: cellWidth,
                        border: `1px solid ${isCurrentMonth && inRange ? t.accent : 'transparent'}`,
                        transition: 'background 0.15s, border 0.15s',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={(e) => {
                        if (isCurrentMonth && !hasTemplate) {
                          e.currentTarget.style.background = t.navHoverBg;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isCurrentMonth && !hasTemplate) {
                          e.currentTarget.style.background = inRange
                            ? t.accentGlow
                            : isWeekend
                            ? t.bg
                            : 'transparent';
                        }
                      }}
                    >
                      <div style={{ fontWeight: isCurrentMonth ? 500 : 300 }}>{day}</div>

                      {hasTemplate && (
                        <div
                          style={{
                            fontSize: isMobile ? 9 : 10,
                            color: textColor,
                            fontWeight: 500,
                            marginTop: 2,
                            background: 'rgba(255,255,255,0.15)',
                            borderRadius: 4,
                            padding: '1px 4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {getTemplateLabel(assignment!.shift_template_id!)}
                        </div>
                      )}

                      {hasShifts && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 2,
                            justifyContent: 'center',
                            marginTop: 2,
                            flexWrap: 'wrap',
                          }}
                        >
                          {assignment!.day_shift     && <ShiftBadge kind="Д" value={assignment!.day_shift} />}
                          {assignment!.evening_shift && <ShiftBadge kind="В" value={assignment!.evening_shift} />}
                          {assignment!.night_shift   && <ShiftBadge kind="Н" value={assignment!.night_shift} />}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ───── Блок 1: назначение шаблона ───── */}
      <div
        style={{
          marginTop: 20,
          borderTop: `1px solid ${t.border}`,
          paddingTop: 16,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8, color: t.text }}>Назначение шаблона</div>
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: isMobile ? 'stretch' : 'center',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: isMobile ? 0 : 170,
              maxWidth: isMobile ? 'none' : 180,
            }}
          >
            <DateTimePicker
              label="Начало"
              theme={t}
              value={startDate}
              onChange={(val) => {
                setStartDate(val);
                if (val && rangeEnd) resetRange();
              }}
              enableDate
              enableTime={false}
            />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: isMobile ? 0 : 170,
              maxWidth: isMobile ? 'none' : 180,
            }}
          >
            <DateTimePicker
              label="Конец"
              theme={t}
              value={endDate}
              onChange={(val) => {
                setEndDate(val);
                if (val && rangeStart) resetRange();
              }}
              enableDate
              enableTime={false}
            />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: isMobile ? 0 : 170,
              maxWidth: isMobile ? 'none' : 300,
            }}
          >
            <SearchableSelect
              label="Шаблон"
              theme={t}
              options={templateOptions.map(({ value, label }) => ({ value, label }))}
              value={selectedTemplate}
              onChange={setSelectedTemplate}
            />
          </div>
          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            <Button
              theme={t}
              variant={selectedTemplate ? 'primary' : 'danger'}
              onClick={handleApplyTemplate}
              size="md"
            >
              {selectedTemplate ? 'Применить шаблон' : 'Удалить'}
            </Button>
          </div>
        </div>
      </div>

      {/* ───── Блок 2: назначение смен A/B/C ───── */}
      <div
        style={{
          marginTop: 16,
          borderTop: `1px solid ${t.border}`,
          paddingTop: 16,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8, color: t.text }}>
          Назначение смен{' '}
          <span style={{ fontWeight: 400, color: t.placeholder, fontSize: 13 }}>
            (на выбранный выше диапазон)
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: isMobile ? 'stretch' : 'center',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: isMobile ? 0 : 170,
              maxWidth: isMobile ? 'none' : 220,
            }}
          >
            <SearchableSelect
              label="Смена"
              theme={t}
              options={shiftOptions.map(({ value, label }) => ({ value, label }))}
              value={selectedShift}
              onChange={setSelectedShift}
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {([
              { label: 'Дневная',  checked: applyDay,     set: setApplyDay },
              { label: 'Вечерняя', checked: applyEvening, set: setApplyEvening },
              { label: 'Ночная',   checked: applyNight,   set: setApplyNight },
            ] as const).map(({ label, checked, set }) => (
              <label
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  color: t.text,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => set(e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>

          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            <Button
              theme={t}
              variant="primary"
              onClick={applyShiftAssignment}
              size="md"
            >
              Применить смену
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}