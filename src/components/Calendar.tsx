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
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleApply = () => {
    if (!startDate || !endDate || !selectedTemplate) return;
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (!start || !end) return;
    if (start.year > end.year ||
        (start.year === end.year && start.month > end.month) ||
        (start.year === end.year && start.month === end.month && start.day > end.day)) {
      return;
    }

    const newAssignments = { ...assignments };
    const current = { year: start.year, month: start.month, day: start.day };
    while (current.year < end.year ||
           (current.year === end.year && current.month < end.month) ||
           (current.year === end.year && current.month === end.month && current.day <= end.day)) {
      const dateStr = formatLocalDate(current.year, current.month, current.day);
      newAssignments[dateStr] = selectedTemplate;
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

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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

                  return (
                    <td
                      key={dateStr}
                      style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        fontSize: 14,
                        color: isCurrentMonth ? t.text : t.placeholder,
                        background: assignment ? bgColor : (isWeekend ? t.bg : 'transparent'),
                        borderRadius: 6,
                        cursor: 'default',
                        minWidth: 36,
                        border: '1px solid transparent',
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
              onChange={setStartDate}
              enableDate
              enableTime={false}
            />
          </div>
          <div style={{ flex: 1, minWidth: 170, maxWidth: 180 }}>
            <DateTimePicker
              label="Конец"
              theme={t}
              value={endDate}
              onChange={setEndDate}
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
              variant="primary"
              onClick={handleApply}
              size="md"
            >
              Применить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}