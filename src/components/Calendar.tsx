// Calendar.tsx — календарь смен: диапазоны, шаблоны, дневные/вечерние/ночные смены.
import React, { useMemo, useReducer, useState } from 'react';
import type { Theme } from '../themes/theme';
import CustomInput from './CustomInput';
import CustomSelect from './CustomSelect';
import Button from './Button';
import { useResponsive } from '../context/AppContext';

/** Шаблон смены (раскраска дней). */
export interface TemplateOption { value: string; label: string; color?: string; backgroundColor?: string; }
/** Вариант смены. */
export interface ShiftOption { value: string; label: string; color?: string; backgroundColor?: string; }
/** Назначение на дату. */
export interface CalendarAssignment {
  shift_template_id: string | null;
  day_shift: string | null;
  evening_shift: string | null;
  night_shift: string | null;
}

export interface CalendarProps {
  /** Тема оформления. */
  theme: Theme;
  /** Шаблоны для назначения. */
  templateOptions: TemplateOption[];
  /** Варианты смен. @default A/B/C */
  shiftOptions?: ShiftOption[];
  /** Включить блок смен. */
  enableShifts?: boolean;
  /** Назначения по датам 'YYYY-MM-DD'. */
  assignments: Record<string, CalendarAssignment>;
  /** Колбэк изменения назначений. */
  onAssignmentsChange?: (assignments: Record<string, CalendarAssignment>) => void;
}

export const DEFAULT_SHIFT_OPTIONS: ShiftOption[] = [
  { value: 'A', label: 'Смена A', color: '#3498db', backgroundColor: 'rgba(52,152,219,0.25)' },
  { value: 'B', label: 'Смена B', color: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.25)' },
  { value: 'C', label: 'Смена C', color: '#2ecc71', backgroundColor: 'rgba(46,204,113,0.25)' },
];

const EMPTY_ASSIGNMENT: CalendarAssignment = { shift_template_id: null, day_shift: null, evening_shift: null, night_shift: null };
const CLEAR_SENTINEL = '__clear__';
const MAX_RANGE_DAYS = 20_000;

/* helpers */
const pad2 = (n: number) => String(n).padStart(2, '0');
const formatLocalDate = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
function parseLocalDate(s: string): { year: number; month: number; day: number } | null {
  const parts = s.split('-');
  if (parts.length !== 3) return null;
  const year = +parts[0], month = +parts[1] - 1, day = +parts[2];
  return isNaN(year) || isNaN(month) || isNaN(day) ? null : { year, month, day };
}
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const mondayBased = (day: number) => (day === 0 ? 6 : day - 1);
function forEachDateInRange(start: string, end: string, cb: (dateStr: string) => void) {
  const s = parseLocalDate(start), e = parseLocalDate(end);
  if (!s || !e) return;
  const cur = new Date(s.year, s.month, s.day);
  const last = new Date(e.year, e.month, e.day);
  for (let guard = 0; guard < MAX_RANGE_DAYS && cur <= last; guard++) {
    cb(formatLocalDate(cur.getFullYear(), cur.getMonth(), cur.getDate()));
    cur.setDate(cur.getDate() + 1);
  }
}
const resolveShift = (selected: string, current: string | null): string | null =>
  selected === '' ? current : selected === CLEAR_SENTINEL ? null : selected;

/* range state */
interface RangeState { currentDate: Date; startDate: string; endDate: string; rangeStart: string | null; rangeEnd: string | null; }
type RangeAction =
  | { type: 'PREV_MONTH' } | { type: 'NEXT_MONTH' } | { type: 'RESET' }
  | { type: 'SET_START_DATE'; value: string } | { type: 'SET_END_DATE'; value: string }
  | { type: 'START_RANGE'; dateStr: string } | { type: 'END_RANGE'; start: string; end: string }
  | { type: 'NAVIGATE_TO'; date: Date };

function rangeReducer(state: RangeState, action: RangeAction): RangeState {
  switch (action.type) {
    case 'PREV_MONTH':
    case 'NEXT_MONTH': {
      const d = action.type === 'PREV_MONTH' ? -1 : 1;
      return { ...state, currentDate: new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + d, 1), startDate: '', endDate: '', rangeStart: null, rangeEnd: null };
    }
    case 'RESET': return { ...state, startDate: '', endDate: '', rangeStart: null, rangeEnd: null };
    case 'SET_START_DATE':
      return { ...state, startDate: action.value, ...(state.rangeEnd !== null ? { rangeStart: null, rangeEnd: null } : null) };
    case 'SET_END_DATE':
      return { ...state, endDate: action.value, ...(state.rangeEnd !== null ? { rangeStart: null, rangeEnd: null } : null) };
    case 'START_RANGE': return { ...state, rangeStart: action.dateStr, rangeEnd: null, startDate: action.dateStr, endDate: '' };
    case 'END_RANGE': return { ...state, rangeStart: action.start, rangeEnd: action.end, startDate: action.start, endDate: action.end };
    case 'NAVIGATE_TO': return { currentDate: action.date, startDate: '', endDate: '', rangeStart: null, rangeEnd: null };
    default: return state;
  }
}

/* badges */
const shiftTitle = (kind: 'Д' | 'В' | 'Н', opt?: ShiftOption, value?: string) =>
  `${kind === 'Д' ? 'Дневная' : kind === 'В' ? 'Вечерняя' : 'Ночная'} смена: ${opt?.label ?? value}`;

const ShiftBadge = ({ kind, value, shiftOptions }: { kind: 'Д' | 'В' | 'Н'; value: string; shiftOptions: ShiftOption[] }) => {
  const opt = shiftOptions.find((o) => o.value === value);
  return (
    <span title={shiftTitle(kind, opt, value)} style={{
      display: 'inline-block', background: opt?.backgroundColor ?? 'rgba(0,0,0,0.15)',
      color: opt?.color ?? 'inherit', padding: '0 3px', borderRadius: 3,
      fontWeight: 700, fontSize: 10, lineHeight: '14px', whiteSpace: 'nowrap',
    }}>{kind}{value}</span>
  );
};

const ShiftDots = ({ assignment, shiftOptions }: { assignment: CalendarAssignment; shiftOptions: ShiftOption[] }) => {
  const items: Array<{ kind: 'Д' | 'В' | 'Н'; value: string }> = [];
  if (assignment.day_shift) items.push({ kind: 'Д', value: assignment.day_shift });
  if (assignment.evening_shift) items.push({ kind: 'В', value: assignment.evening_shift });
  if (assignment.night_shift) items.push({ kind: 'Н', value: assignment.night_shift });
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 3 }}>
      {items.map(({ kind, value }) => {
        const opt = shiftOptions.find((o) => o.value === value);
        return <span key={kind} title={shiftTitle(kind, opt, value)}
          style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: opt?.color ?? '#888' }} />;
      })}
    </div>
  );
};

/** Календарь назначения шаблонов и смен на диапазоны дат. */
export default function Calendar({
  theme: t, templateOptions, shiftOptions = DEFAULT_SHIFT_OPTIONS,
  enableShifts = false, assignments, onAssignmentsChange,
}: CalendarProps) {
  const { isMobile } = useResponsive();
  const [range, dispatch] = useReducer(rangeReducer, {
    currentDate: new Date(), startDate: '', endDate: '', rangeStart: null, rangeEnd: null,
  });
  const [selectedTemplate, setSelectedTemplate] = useState(templateOptions[0]?.value ?? '');
  const [dayShift, setDayShift] = useState('');
  const [eveningShift, setEveningShift] = useState('');
  const [nightShift, setNightShift] = useState('');

  const year = range.currentDate.getFullYear();
  const month = range.currentDate.getMonth();
  const dim = daysInMonth(year, month);
  const firstDayIndex = mondayBased(new Date(year, month, 1).getDay());
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const daysInPrev = daysInMonth(prevMonthYear, prevMonth);
  const totalCells = Math.ceil((firstDayIndex + dim) / 7) * 7;

  const applyOrRemoveAssignments = (start: string, end: string, template: string) => {
    const next = { ...assignments };
    forEachDateInRange(start, end, (dateStr) => {
      if (template) {
        const prev = next[dateStr];
        next[dateStr] = {
          shift_template_id: template,
          day_shift: prev?.day_shift ?? null,
          evening_shift: prev?.evening_shift ?? null,
          night_shift: prev?.night_shift ?? null,
        };
      } else delete next[dateStr];
    });
    onAssignmentsChange?.(next);
  };

  const applyShiftAssignment = () => {
    if (!enableShifts || !range.startDate || !range.endDate) return;
    if (!dayShift && !eveningShift && !nightShift) return;
    const next = { ...assignments };
    forEachDateInRange(range.startDate, range.endDate, (dateStr) => {
      const prev = next[dateStr] ?? { ...EMPTY_ASSIGNMENT };
      next[dateStr] = {
        ...prev,
        day_shift: resolveShift(dayShift, prev.day_shift),
        evening_shift: resolveShift(eveningShift, prev.evening_shift),
        night_shift: resolveShift(nightShift, prev.night_shift),
      };
    });
    onAssignmentsChange?.(next);
    dispatch({ type: 'RESET' });
  };

  const handleDateClick = (dateStr: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      const parsed = parseLocalDate(dateStr);
      if (parsed) dispatch({ type: 'NAVIGATE_TO', date: new Date(parsed.year, parsed.month, 1) });
      return;
    }
    if (range.rangeStart !== null && range.rangeEnd !== null) { dispatch({ type: 'RESET' }); return; }
    if (range.rangeStart === null) { dispatch({ type: 'START_RANGE', dateStr }); return; }
    const s = parseLocalDate(range.rangeStart), e = parseLocalDate(dateStr);
    if (!s || !e) return;
    const reversed = new Date(e.year, e.month, e.day) < new Date(s.year, s.month, s.day);
    const start = reversed ? dateStr : range.rangeStart;
    const end = reversed ? range.rangeStart : dateStr;
    dispatch({ type: 'END_RANGE', start, end });
    if (selectedTemplate) applyOrRemoveAssignments(start, end, selectedTemplate);
  };

  const handleApplyTemplate = () => {
    if (!range.startDate || !range.endDate) return;
    applyOrRemoveAssignments(range.startDate, range.endDate, selectedTemplate);
    dispatch({ type: 'RESET' });
  };

  const days = useMemo(() => {
    const out: Array<{ day: number; dateStr: string; isCurrentMonth: boolean; assignment?: CalendarAssignment }> = [];
    for (let i = 0; i < totalCells; i++) {
      let day: number, m: number, y: number;
      if (i < firstDayIndex) { day = daysInPrev - (firstDayIndex - i) + 1; m = prevMonth; y = prevMonthYear; }
      else if (i >= firstDayIndex + dim) { day = i - (firstDayIndex + dim) + 1; m = month === 11 ? 0 : month + 1; y = month === 11 ? year + 1 : year; }
      else { day = i - firstDayIndex + 1; m = month; y = year; }
      const dateStr = formatLocalDate(y, m, day);
      out.push({ day, dateStr, isCurrentMonth: m === month && y === year, assignment: assignments[dateStr] });
    }
    return out;
  }, [totalCells, firstDayIndex, dim, daysInPrev, prevMonth, prevMonthYear, month, year, assignments]);

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const getTemplate = (value: string | null) => value ? templateOptions.find((o) => o.value === value) : undefined;
  const isDateInRange = (dateStr: string) => {
    if (!range.rangeStart || !range.rangeEnd) return false;
    return dateStr >= range.rangeStart && dateStr <= range.rangeEnd; // ISO-строки сравнимы лексикографически
  };
  const hasAnyShift = (a?: CalendarAssignment) => !!a && (!!a.day_shift || !!a.evening_shift || !!a.night_shift);
  const shiftSelectOptions = [
    { value: '', label: '— не менять —' },
    ...shiftOptions.map(({ value, label }) => ({ value, label })),
    { value: CLEAR_SENTINEL, label: '✕ Сбросить' },
  ];
  const nothingToApplyShift = !dayShift && !eveningShift && !nightShift;
  const navBtn: React.CSSProperties = {
    background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8,
    padding: isMobile ? '8px 12px' : '4px 12px',
    minWidth: isMobile ? 40 : undefined, minHeight: isMobile ? 40 : undefined,
    cursor: 'pointer', color: t.text, fontSize: 14,
  };

  const shiftAssignmentBody = (
    <>
      <div style={{
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: 12,
        alignItems: isMobile ? 'stretch' : 'center',
      }}>
        {([['Дневная смена', dayShift, setDayShift], ['Вечерняя смена', eveningShift, setEveningShift], ['Ночная смена', nightShift, setNightShift]] as const).map(([label, value, set]) => (
          <div key={label} style={{ flex: 1, minWidth: isMobile ? 0 : 170, maxWidth: 250 }}>
            <CustomSelect label={label} theme={t} options={shiftSelectOptions} value={value} onChange={set} />
          </div>
        ))}
        <div style={{ width: isMobile ? '100%' : 'auto' }}>
          <Button theme={t} variant="primary" onClick={applyShiftAssignment} size="md">Применить смены</Button>
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: t.placeholder }}>
        {nothingToApplyShift
          ? 'Выберите хотя бы одну смену, чтобы применить.'
          : 'Пустое значение «— не менять —» оставит слот без изменений; «✕ Сбросить» очищает его.'}
      </div>
    </>
  );

  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, padding: isMobile ? 12 : 20, background: t.bgSurface, color: t.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 600 }}>
          {range.currentDate.toLocaleString('ru', { month: 'long', year: 'numeric' })}
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => dispatch({ type: 'PREV_MONTH' })} style={navBtn} aria-label="Предыдущий месяц">◀</button>
          <button type="button" onClick={() => dispatch({ type: 'NEXT_MONTH' })} style={navBtn} aria-label="Следующий месяц">▶</button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {weekDays.map((day) => (
              <th key={day} scope="col" style={{
                padding: isMobile ? '6px 0' : '8px 0', textAlign: 'center', fontWeight: 600,
                fontSize: isMobile ? 12 : 14, color: t.placeholder, borderBottom: `1px solid ${t.border}`, width: '14.285%',
              }}>{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.ceil(totalCells / 7) }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {days.slice(rowIndex * 7, (rowIndex + 1) * 7).map((dayInfo, colIndex) => {
                const { day, dateStr, isCurrentMonth, assignment } = dayInfo;
                const isWeekend = colIndex === 5 || colIndex === 6;
                const template = getTemplate(assignment?.shift_template_id ?? null);
                const bgColor = template?.backgroundColor ?? (template?.color ? `${template.color}40` : 'rgba(46,204,113,0.25)');
                const textColor = template?.color || '#27ae60';
                const inRange = isDateInRange(dateStr);
                const hasTemplate = !!assignment?.shift_template_id;
                const hasShifts = enableShifts && hasAnyShift(assignment);
                const baseBg = hasTemplate ? bgColor : isCurrentMonth && inRange ? t.accentGlow : isWeekend ? t.bg : 'transparent';
                return (
                  <td key={dateStr}
                    onClick={() => handleDateClick(dateStr, isCurrentMonth)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDateClick(dateStr, isCurrentMonth); } }}
                    tabIndex={isCurrentMonth ? 0 : -1}
                    role="gridcell" aria-selected={inRange}
                    aria-label={`${dateStr}${hasTemplate ? `, шаблон ${template?.label ?? assignment?.shift_template_id}` : ''}`}
                    style={{
                      padding: isMobile ? '8px 2px' : '6px 4px', textAlign: 'center', verticalAlign: 'top',
                      fontSize: isMobile ? 13 : 14, color: isCurrentMonth ? t.text : t.placeholder,
                      background: baseBg, borderRadius: 6, cursor: isCurrentMonth ? 'pointer' : 'default',
                      width: '14.285%', border: `1px solid ${isCurrentMonth && inRange ? t.accent : 'transparent'}`,
                      transition: 'background 0.15s, border 0.15s', overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => { if (isCurrentMonth && !hasTemplate) e.currentTarget.style.background = t.navHoverBg; }}
                    onMouseLeave={(e) => { if (isCurrentMonth && !hasTemplate) e.currentTarget.style.background = baseBg; }}
                  >
                    <div style={{ fontWeight: isCurrentMonth ? 500 : 300 }}>{day}</div>
                    {hasTemplate && (
                      <div style={{
                        fontSize: isMobile ? 9 : 10, color: textColor, fontWeight: 500, marginTop: 2,
                        background: 'rgba(255,255,255,0.15)', borderRadius: 4, padding: '1px 4px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {template?.label ?? assignment!.shift_template_id}
                      </div>
                    )}
                    {hasShifts && (isMobile ? (
                      <ShiftDots assignment={assignment!} shiftOptions={shiftOptions} />
                    ) : (
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                        {assignment!.day_shift && <ShiftBadge kind="Д" value={assignment!.day_shift} shiftOptions={shiftOptions} />}
                        {assignment!.evening_shift && <ShiftBadge kind="В" value={assignment!.evening_shift} shiftOptions={shiftOptions} />}
                        {assignment!.night_shift && <ShiftBadge kind="Н" value={assignment!.night_shift} shiftOptions={shiftOptions} />}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20, borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: t.text }}>Назначение шаблона</div>
        <div style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: 12,
          alignItems: isMobile ? 'stretch' : 'center',
        }}>
          <div style={{ flex: 1, minWidth: isMobile ? 0 : 170, maxWidth: isMobile ? 'none' : 180 }}>
            <CustomInput type="date" label="Начало" theme={t} value={range.startDate}
              onChange={(val) => dispatch({ type: 'SET_START_DATE', value: val })} />
          </div>
          <div style={{ flex: 1, minWidth: isMobile ? 0 : 170, maxWidth: isMobile ? 'none' : 180 }}>
            <CustomInput type="date" label="Конец" theme={t} value={range.endDate}
              onChange={(val) => dispatch({ type: 'SET_END_DATE', value: val })} />
          </div>
          <div style={{ flex: 1, minWidth: isMobile ? 0 : 170, maxWidth: isMobile ? 'none' : 400 }}>
            <CustomSelect label="Шаблон" theme={t}
              options={templateOptions.map(({ value, label }) => ({ value, label }))}
              value={selectedTemplate} onChange={setSelectedTemplate} />
          </div>
          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            <Button theme={t} variant={selectedTemplate ? 'primary' : 'danger'} onClick={handleApplyTemplate} size="md">
              {selectedTemplate ? 'Применить шаблон' : 'Удалить'}
            </Button>
          </div>
        </div>
      </div>

      {enableShifts && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
          {isMobile ? (
            <details>
              <summary style={{ fontWeight: 600, cursor: 'pointer', padding: '6px 0', color: t.text, listStyle: 'revert' }}>
                Назначение смен
              </summary>
              <div style={{ marginTop: 8 }}>{shiftAssignmentBody}</div>
            </details>
          ) : (
            <>
              <div style={{ fontWeight: 600, marginBottom: 8, color: t.text }}>Назначение смен</div>
              {shiftAssignmentBody}
            </>
          )}
        </div>
      )}
    </div>
  );
}