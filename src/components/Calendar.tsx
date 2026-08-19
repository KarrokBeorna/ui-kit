import React, { useState } from 'react';
import type { Theme } from '../themes/theme';
import DateTimePicker from './DateTimePicker';
import SearchableSelect from './SearchableSelect';
import Button from './Button';

export interface TemplateOption {
  value: string;
  label: string;
  color?: string;
  backgroundColor?: string;
}

interface DayInfo {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
  assignment?: string;
}

interface CalendarProps {
  theme: Theme;
  templateOptions: TemplateOption[];
  initialAssignments?: Record<string, string>;
  onAssignmentsChange?: (assignments: Record<string, string>) => void;
}

// Вспомогательные функции
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

export default function Calendar({
  theme: t,
  templateOptions,
  initialAssignments = {},
  onAssignmentsChange,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState<Record<string, string>>(initialAssignments);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(
    templateOptions.length > 0 ? templateOptions[0].value : ''
  );

  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

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

  // Основная функция для применения или удаления назначений
  const applyOrRemoveAssignments = (start: string, end: string, template: string) => {
    const startParsed = parseLocalDate(start);
    const endParsed = parseLocalDate(end);
    if (!startParsed || !endParsed) return;

    const newAssignments = { ...assignments };
    const current = { year: startParsed.year, month: startParsed.month, day: startParsed.day };
    while (current.year < endParsed.year ||
           (current.year === endParsed.year && current.month < endParsed.month) ||
           (current.year === endParsed.year && current.month === endParsed.month && current.day <= endParsed.day)) {
      const dateStr = formatLocalDate(current.year, current.month, current.day);
      if (template) {
        newAssignments[dateStr] = template;
      } else {
        delete newAssignments[dateStr]; // удаляем, если шаблон пустой
      }
      const next = new Date(current.year, current.month, current.day + 1);
      current.year = next.getFullYear();
      current.month = next.getMonth();
      current.day = next.getDate();
    }
    setAssignments(newAssignments);
    if (onAssignmentsChange) {
      onAssignmentsChange(newAssignments);
    }
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
      // Автоприменяем только если выбран шаблон
      if (selectedTemplate) {
        applyOrRemoveAssignments(rangeStart, dateStr, selectedTemplate);
      }
    }
  };

  const handleApply = () => {
    if (!startDate || !endDate) return;
    // Применяем или удаляем в зависимости от выбранного шаблона
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
    const isCurrentMonth = (monthForDate === month && yearForDate === year);
    const assignment = assignments[dateStr];
    days.push({ day, dateStr, isCurrentMonth, assignment });
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getTemplateLabel = (value: string) => {
    const found = templateOptions.find(o => o.value === value);
    return found ? found.label : value;
  };

  const getTemplate = (value: string) => {
    return templateOptions.find(o => o.value === value);
  };

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

  return (
    <div
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: 20,
        background: t.bgSurface,
        color: t.text,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          {new Date(year, month).toLocaleString('ru', { month: 'long', year: 'numeric' })}
        </h2>
        <div>
          <button
            onClick={handlePrevMonth}
            style={{
              background: 'transparent',
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              padding: '4px 12px',
              cursor: 'pointer',
              color: t.text,
              marginRight: 8,
              fontSize: 14,
            }}
          >
            ◀
          </button>
          <button
            onClick={handleNextMonth}
            style={{
              background: 'transparent',
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              padding: '4px 12px',
              cursor: 'pointer',
              color: t.text,
              fontSize: 14,
            }}
          >
            ▶
          </button>
        </div>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
        }}
      >
        <thead>
          <tr>
            {weekDays.map((day) => (
              <th
                key={day}
                style={{
                  padding: '8px 0',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: 14,
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
                  const template = assignment ? getTemplate(assignment) : undefined;
                  const bgColor = template?.backgroundColor
                    ? template.backgroundColor
                    : template?.color
                    ? `${template.color}40`
                    : 'rgba(46, 204, 113, 0.25)';
                  const textColor = template?.color || '#27ae60';

                  const inRange = isDateInRange(dateStr);

                  return (
                    <td
                      key={dateStr}
                      onClick={() => handleDateClick(dateStr, isCurrentMonth)}
                      style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        fontSize: 14,
                        color: isCurrentMonth ? t.text : t.placeholder,
                        background: assignment
                          ? bgColor
                          : isCurrentMonth && inRange
                          ? t.accentGlow
                          : isWeekend
                          ? t.bg
                          : 'transparent',
                        borderRadius: 6,
                        cursor: isCurrentMonth ? 'pointer' : 'default',
                        width: cellWidth,
                        border: `1px solid ${
                          isCurrentMonth && inRange
                            ? t.accent
                            : 'transparent'
                        }`,
                        transition: 'background 0.15s, border 0.15s',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        if (isCurrentMonth && !assignment) {
                          e.currentTarget.style.background = t.navHoverBg;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isCurrentMonth && !assignment) {
                          e.currentTarget.style.background = inRange
                            ? t.accentGlow
                            : isWeekend
                            ? t.bg
                            : 'transparent';
                        }
                      }}
                    >
                      <div style={{ fontWeight: isCurrentMonth ? 500 : 300 }}>{day}</div>
                      {assignment && (
                        <div
                          style={{
                            fontSize: 10,
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
                          {getTemplateLabel(assignment)}
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

      <div
        style={{
          marginTop: 20,
          borderTop: `1px solid ${t.border}`,
          paddingTop: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center'
          }}
        >
          <div style={{ flex: 1, minWidth: 170, maxWidth: 180 }}>
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
          <div style={{ flex: 1, minWidth: 170, maxWidth: 180 }}>
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
          <div style={{ flex: 1, minWidth: 170, maxWidth: 300 }}>
            <SearchableSelect
              label="Шаблон"
              theme={t}
              options={templateOptions.map(({ value, label }) => ({ value, label }))}
              value={selectedTemplate}
              onChange={setSelectedTemplate}
            />
          </div>
          <div style={{  }}>
            <Button
              theme={t}
              variant={selectedTemplate ? "primary" : "danger"}
              onClick={handleApply}
              size="md"
            >
              {selectedTemplate ? 'Применить' : 'Удалить'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}