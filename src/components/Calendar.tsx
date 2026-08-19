import React, { useState } from 'react';
import type { Theme } from '../themes/theme';
import DateTimePicker from './DateTimePicker';
import SearchableSelect from './SearchableSelect';
import Button from './Button';

interface CalendarProps {
  theme: Theme;
}

// Вспомогательные функции для работы с датами
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0 – воскресенье
}

function getMondayBasedDay(day: number): number {
  return day === 0 ? 6 : day - 1;
}

export default function Calendar({ theme: t }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('work');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getMondayBasedDay(getFirstDayOfMonth(year, month));

  // Данные для пустых ячеек (предыдущий/следующий месяц)
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 0 ? 11 : month - 1; // не используется, но для ясности

  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleApply = () => {
    if (!startDate || !endDate || !selectedTemplate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return;
    const newAssignments = { ...assignments };
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      newAssignments[dateStr] = selectedTemplate;
    }
    setAssignments(newAssignments);
  };

  // Формируем массив дней
  const days = [];
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
    const dateObj = new Date(yearForDate, monthForDate, day);
    const dateStrFull = dateObj.toISOString().split('T')[0];
    const isCurrentMonth = (monthForDate === month && yearForDate === year);
    const assignment = assignments[dateStrFull];
    days.push({ day, dateStr: dateStrFull, isCurrentMonth, assignment });
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Опции для выбора шаблона
  const templateOptions = [
    { value: 'work', label: 'Рабочий' },
    { value: 'weekend', label: 'Выходной' },
    { value: 'holiday', label: 'Праздничный' },
  ];

  // Функция для форматирования названия шаблона (для отображения в ячейке)
  const getTemplateLabel = (value: string) => {
    const found = templateOptions.find(o => o.value === value);
    return found ? found.label : value;
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
      {/* Заголовок с переключением месяца */}
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

      {/* Таблица календаря */}
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
                {rowDays.map((dayInfo) => {
                  const { day, dateStr, isCurrentMonth, assignment } = dayInfo;
                  // Выходные – последние два столбца (индекс 5 и 6)
                  const colIndex = rowDays.indexOf(dayInfo);
                  const isWeekend = colIndex === 5 || colIndex === 6;
                  return (
                    <td
                      key={dateStr}
                      style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        fontSize: 14,
                        color: isCurrentMonth ? t.text : t.placeholder,
                        background: assignment
                          ? 'rgba(46, 204, 113, 0.25)'
                          : isWeekend
                          ? t.bg
                          : 'transparent',
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
                            color: '#27ae60',
                            fontWeight: 500,
                            marginTop: 2,
                            background: 'rgba(46, 204, 113, 0.15)',
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

      {/* Панель управления с компонентами библиотеки */}
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
          }}
        >
          <div style={{ flex: 1, minWidth: 170 }}>
            <DateTimePicker
              label="Начало"
              theme={t}
              value={startDate}
              onChange={setStartDate}
              enableDate
              enableTime={false}
            />
          </div>
          <div style={{ flex: 1, minWidth: 170 }}>
            <DateTimePicker
              label="Конец"
              theme={t}
              value={endDate}
              onChange={setEndDate}
              enableDate
              enableTime={false}
            />
          </div>
          <div style={{ flex: 1, minWidth: 170 }}>
            <SearchableSelect
              label="Шаблон"
              theme={t}
              options={templateOptions}
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