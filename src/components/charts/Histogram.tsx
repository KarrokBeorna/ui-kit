import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Theme } from '../../themes/theme';
import { useResponsive } from '../../context/ResponsiveContext';
import { useResizeObserver } from '../../hooks/useResizeObserver';

// ─── Типы данных ──────────────────────────────────────────────

/**
 * Один столбик. Плоская структура: серия задаётся полем `series`,
 * а не вложенными массивами. Если `series` не указана —
 * используется String(id), то есть каждый столбик своей серией.
 */
export interface HistogramDataItem {
  /** Уникальный идентификатор. */
  id: string | number;

  /** Подпись по оси X (категория). Одинаковые label группируются. */
  label: string;

  /** Числовое значение высоты столбика. */
  value: number;

  /**
   * Имя серии. Столбики одной серии получают одинаковый цвет
   * и группируются рядом (или друг на друга при stacked).
   * Если не указано — берётся String(id).
   */
  series?: string;

  /**
   * Явный цвет столбика. Если не указан для серии —
   * генерируется автоматически по её имени (HSL с золотым сечением).
   * Первый указанный цвет для серии «выигрывает».
   */
  color?: string;
}

export interface HistogramProps {
  /** Плоский массив элементов. Группировка по label и series. */
  data: HistogramDataItem[];

  /**
   * Ширина диаграммы, px.
   * На мобиле игнорируется — берётся ширина контейнера.
   * @default 700
   */
  width?: number;

  /**
   * Высота диаграммы (включая легенду), px.
   * На мобиле вычисляется от ширины (примерно w * 0.75, не более 380).
   * @default 450
   */
  height?: number;

  /** Тема. Обязательна. */
  theme: Theme;

  /**
   * Показывать ли легенду серий.
   * Легенда кликабельна: тап/hover по элементу выделяет всю серию.
   * @default true
   */
  showLegend?: boolean;

  /**
   * Показывать ли ось X с подписями категорий.
   * @default true
   */
  showXAxis?: boolean;

  /**
   * Показывать ли ось Y со шкалой значений.
   * @default true
   */
  showYAxis?: boolean;

  /**
   * Показывать ли числовые значения внутри столбиков.
   * Если столбик слишком узкий — текст автоматически поворачивается
   * под 45° или 90°, а если и это не спасает — не рисуется.
   * @default false
   */
  showValues?: boolean;

  /**
   * Подпись под осью X. На мобиле не рендерится (нет места).
   * Скрывается, если не указано.
   */
  xAxisLabel?: string;

  /**
   * Подпись слева от оси Y (повёрнута на -90°). На мобиле не рендерится.
   */
  yAxisLabel?: string;

  /**
   * Размер шрифта подписей осей и легенды, px.
   * На мобиле автоматически уменьшается на 2.
   * @default 12
   */
  axisLabelFontSize?: number;

  /**
   * Размер шрифта значений внутри столбиков, px.
   * На мобиле автоматически уменьшается на 2.
   * @default 12
   */
  valuesFontSize?: number;

  /**
   * Режим отрисовки баров:
   *  - 'grouped' — столбики разных серий стоят рядом внутри категории;
   *  - 'stacked' — столбики серий накладываются друг на друга,
   *                 высота отражает сумму.
   * @default 'grouped'
   */
  barMode?: 'stacked' | 'grouped';

  /**
   * Сортировка сегментов внутри стека (только при barMode='stacked').
   *  - 'none' — порядок как в seriesSet (по умолчанию);
   *  - 'desc' — по убыванию значения (крупные сегменты — у основания столбца);
   *  - 'asc'  — по возрастанию значения.
   * Сортировка выполняется отдельно для каждой колонки (per-label),
   * чтобы внутри каждого столбца крупные сегменты были снизу.
   * @default 'none'
   */
  sortStackedSegments?: 'none' | 'desc' | 'asc';

  /**
   * Фиксированный шаг шкалы Y. Если не указан — подбирается
   * автоматически «красивым» числом (1, 2, 5, 10, 20, 50...).
   * На мобиле авто-подбор использует 4 деления, на десктопе — 6.
   */
  stepSize?: number;

  /**
   * Отступ между группами баров в режиме 'grouped' (0..0.8).
   * 0 — вплотную, 0.8 — почти без баров.
   * @default 0.2
   */
  groupGap?: number;

  /**
   * Непрозрачность неактивных серий при выделении одной (0..1).
   * Меньше — сильнее затемнение остальных серий.
   * @default 0.25
   */
  dimOpacity?: number;

  /**
   * Колбэк при наведении (мышь) или тапе (палец) на бар
   * или на элемент легенды.
   * Получает сам item или null, когда выделение сброшено.
   *
   * Замечание: для элемента легенды в колбэк передаётся
   * «первый подходящий» элемент серии (первый по порядку в data
   * с этой series), т.к. у легенды нет своего конкретного item.
   */
  onBarHover?: (item: HistogramDataItem | null) => void;

  /**
   * Колбэк при клике (мышью) или тапе (пальцем) по конкретному
   * бару. При тапе по элементу легенды НЕ вызывается.
   * Получает сам item.
   */
  onBarClick?: (item: HistogramDataItem | null) => void;

  /**
   * Снимать ли выделение серии при тапе в любом месте вне диаграммы.
   * Работает только для тач-устройств (pointerType !== 'mouse').
   * На десктопе выделение снимается само на pointerleave.
   * @default true
   */
  dismissOnOutsideTap?: boolean;
}

// ─── Вспомогательные функции ──────────────────────────────────

/**
 * Быстрый строковый хеш (FNV-1a). Работает для любых Unicode-строк:
 * кириллицы, эмодзи, иероглифов. Используется для генерации
 * стабильного цвета серии по её имени, когда parseInt(..., 36)
 * не может этого сделать.
 */
function stringHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const CSS_FN_COLOR = /^(rgb|rgba|hsl|hsla)\(/i;

/**
 * Возвращает CSS-цвет по id/имени серии.
 * - '#...'                 — hex как есть;
 * - 'rgb(...)', 'hsl(...)' — функциональные цвета как есть;
 * - число                  — детерминированный HSL по золотому сечению;
 * - строка                 — хеш строки → HSL (работает для кириллицы,
 *                             эмодзи и любых Unicode-строк).
 *
 * Замечание: раньше здесь использовался parseInt(id, 36), который для
 * строк вроде 'Производство' возвращает NaN — браузер молча игнорировал
 * невалидный hsl(NaN, ...), и столбик рисовался чёрным/прозрачным.
 */
function getColorById(id: string | number): string {
  // 1. Явный CSS-цвет — возвращаем без изменений
  if (typeof id === 'string') {
    const t = id.trim();
    if (t.startsWith('#')) return t;
    if (CSS_FN_COLOR.test(t)) return t;
  }

  // 2. Определяем seed: число — как есть, «числовая» строка — в число,
  //    иначе — стабильный хеш от строки
  let seed: number;
  if (typeof id === 'number') {
    seed = id;
  } else {
    const asNum = Number(id);
    seed = id.trim() !== '' && !isNaN(asNum) ? asNum : stringHash(id);
  }

  // 3. HSL по золотому сечению — равномерное распределение оттенков
  const phi = 0.618033988749895;
  const frac = (((seed * phi) % 1) + 1) % 1;   // на случай отрицательных seed
  const hue = Math.round(frac * 360);
  return `hsl(${hue}, 65%, 55%)`;
}

function groupData(data: HistogramDataItem[]): {
  labels: string[];
  seriesSet: string[];
  grouped: Map<string, Map<string, number>>;
  colorMap: Map<string, string>;
} {
  const labelsSet = new Set<string>();
  const seriesSet = new Set<string>();
  const grouped = new Map<string, Map<string, number>>();
  const colorMap = new Map<string, string>();

  data.forEach((item) => {
    labelsSet.add(item.label);
    const series = item.series ?? String(item.id);
    seriesSet.add(series);
  });

  labelsSet.forEach((label) => {
    const map = new Map<string, number>();
    seriesSet.forEach((series) => map.set(series, 0));
    grouped.set(label, map);
  });

  data.forEach((item) => {
    const series = item.series ?? String(item.id);
    const labelMap = grouped.get(item.label);
    if (labelMap) {
      labelMap.set(series, (labelMap.get(series) || 0) + item.value);
    }
    if (item.color && !colorMap.has(series)) {
      colorMap.set(series, item.color);
    }
  });

  // Для серий без явного color — генерируем цвет по имени.
  // getColorById сам решает: hex/rgb/hsl как есть, число → HSL,
  // строка → хеш → HSL (работает для кириллицы).
  seriesSet.forEach((series) => {
    if (!colorMap.has(series)) {
      colorMap.set(series, getColorById(series));
    }
  });

  return {
    labels: Array.from(labelsSet),
    seriesSet: Array.from(seriesSet),
    grouped,
    colorMap,
  };
}

// ─── Основной компонент ──────────────────────────────────────

export function Histogram({
  data,
  width = 700,
  height = 450,
  theme,
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
  showValues = false,
  xAxisLabel,
  yAxisLabel,
  axisLabelFontSize = 12,
  valuesFontSize = 12,
  barMode = 'grouped',
  sortStackedSegments = 'none',
  stepSize,
  groupGap = 0.2,
  dimOpacity = 0.25,
  onBarHover,
  onBarClick,
  dismissOnOutsideTap = true,
}: HistogramProps) {
  // Активная серия — устанавливается hover'ом или тапом.
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

  const { isMobile } = useResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: measuredWidth } = useResizeObserver(containerRef);

  const useMeasured = isMobile && measuredWidth > 0;
  const effectiveWidth = useMeasured ? Math.max(300, measuredWidth - 16) : width;
  const effectiveHeight = useMeasured
    ? Math.max(260, Math.min(effectiveWidth * 0.75, 380))
    : height;

  const effectiveAxisFontSize = isMobile ? Math.max(9, axisLabelFontSize - 2) : axisLabelFontSize;
  const effectiveValuesFontSize = isMobile
    ? Math.max(9, valuesFontSize - 2)
    : valuesFontSize;

  const { labels, seriesSet, grouped, colorMap } = useMemo(() => groupData(data), [data]);

  const maxValue = useMemo(() => {
    let max = 0;
    if (barMode === 'stacked') {
      labels.forEach((label) => {
        const map = grouped.get(label)!;
        let sum = 0;
        map.forEach((val) => (sum += val));
        if (sum > max) max = sum;
      });
    } else {
      grouped.forEach((map) => {
        map.forEach((val) => {
          if (val > max) max = val;
        });
      });
    }
    return max;
  }, [labels, grouped, barMode]);

  const computedStepSize = useMemo(() => {
    if (stepSize && stepSize > 0) return stepSize;
    const targetTicks = isMobile ? 4 : 6;
    let rawStep = maxValue / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    let niceStep;
    if (normalized < 1.5) niceStep = 1;
    else if (normalized < 3.5) niceStep = 2;
    else if (normalized < 7.5) niceStep = 5;
    else niceStep = 10;
    niceStep *= magnitude;
    return niceStep || 1;
  }, [maxValue, stepSize, isMobile]);

  const leftMargin = useMemo(() => {
    const base = isMobile ? 40 : 60;
    if (!showYAxis) return base;
    const maxTick = Math.ceil(maxValue / computedStepSize) * computedStepSize;
    const maxStr = String(maxTick);
    const charWidth = effectiveAxisFontSize * 0.6;
    const textWidth = maxStr.length * charWidth;
    const yLabelWidth = yAxisLabel && !isMobile ? effectiveAxisFontSize * 1.2 : 0;
    return Math.max(base, textWidth + yLabelWidth + 16);
  }, [
    showYAxis,
    maxValue,
    computedStepSize,
    effectiveAxisFontSize,
    yAxisLabel,
    isMobile,
  ]);

  const margin = {
    top: isMobile ? 44 : 60,
    right: isMobile ? 16 : 30,
    bottom: isMobile ? 44 : 50,
    left: leftMargin,
  };

  const chartWidth = effectiveWidth - margin.left - margin.right;
  const chartHeight = effectiveHeight - margin.top - margin.bottom;
  const yMax = Math.max(maxValue, 1);
  const groupCount = labels.length;
  const groupWidth = chartWidth / Math.max(groupCount, 1);
  const effectiveGroupGap = Math.min(Math.max(groupGap, 0), 0.8);
  const barTotalWidth =
    barMode === 'grouped' ? groupWidth * (1 - effectiveGroupGap) : groupWidth * 0.7;
  const barWidth =
    barMode === 'grouped' ? barTotalWidth / Math.max(seriesSet.length, 1) : barTotalWidth;

  // ─── Общий обработчик ────────────────────────────────────
  const setActive = (series: string | null, item: HistogramDataItem | null) => {
    setActiveSeries(series);
    if (onBarHover) onBarHover(item);
  };

  // ─── Тап вне интерактивных элементов снимает выделение ───
  useEffect(() => {
    if (!dismissOnOutsideTap) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (target.closest('[data-histogram-interactive]')) return;
      setActiveSeries(null);
      if (onBarHover) onBarHover(null);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [dismissOnOutsideTap, onBarHover]);

  // ─── Общие handlers для бара и для элемента легенды ─────
  const interactiveHandlers = (series: string, item: HistogramDataItem | null) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      e.stopPropagation();
      setActive(series, item);
    },
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setActive(series, item);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setActive(null, null);
    },
  });

  const handleBarClick = (item: HistogramDataItem) => {
    if (onBarClick) onBarClick(item);
  };

  // ─── Значение внутри бара с автоповоротом ────────────────
  /**
   * Рисует подпись значения с автоматическим выбором угла наклона:
   *   1) 0°  — если текст влезает по ширине и высоте бара;
   *   2) 45° — если бар узкий, но не крошечный (частый случай: 14 баров,
   *            значения вида «102.43»);
   *   3) 90° — если бар совсем узкий, но достаточно высокий;
   *   4) иначе — подпись не рисуется, чтобы не было визуального шума.
   *
   * Для наклонённых подписей добавляем обводку цветом фона:
   * часть текста выходит за пределы цветного бара и иначе
   * сливается с фоном карточки.
   */
  const renderValueLabel = (
    value: number,
    barX: number,
    barY: number,
    barW: number,
    barH: number,
    key: string,
  ): React.ReactNode => {
    if (!showValues) return null;
    if (barH <= 0 || barW <= 0) return null;

    const text = String(value);
    const fs = effectiveValuesFontSize;
    // Грубая оценка ширины текста для текущего шрифта
    const approxTextWidth = text.length * fs * 0.6;

    const cx = barX + barW / 2;
    const cy = barY + barH / 2;

    // 1) Горизонтально — текст влезает целиком
    if (barW >= approxTextWidth + 6 && barH >= fs + 4) {
      return (
        <text
          key={key}
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill={theme.bgSurface}
          fontSize={Math.min(fs, barH * 0.8)}
          fontWeight="bold"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
        >
          {text}
        </text>
      );
    }

    // 2) 45° — узкий, но не крошечный
    if (barW >= 12 && barH >= 20) {
      return (
        <text
          key={key}
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill={theme.text}
          stroke={theme.bgSurface}
          strokeWidth={2}
          paintOrder="stroke"
          fontSize={Math.min(fs, 11)}
          fontWeight="bold"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
          transform={`rotate(-45 ${cx} ${cy})`}
        >
          {text}
        </text>
      );
    }

    // 3) 90° — вертикально
    if (barW >= fs * 0.9 && barH >= approxTextWidth + 6) {
      return (
        <text
          key={key}
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill={theme.text}
          stroke={theme.bgSurface}
          strokeWidth={2}
          paintOrder="stroke"
          fontSize={Math.min(fs, 11)}
          fontWeight="bold"
          pointerEvents="none"
          style={{ userSelect: 'none' }}
          transform={`rotate(-90 ${cx} ${cy})`}
        >
          {text}
        </text>
      );
    }

    return null;
  };

  const renderBars = () => {
    const bars: JSX.Element[] = [];

    labels.forEach((label, labelIndex) => {
      const xGroup = margin.left + labelIndex * groupWidth;
      const map = grouped.get(label)!;

      if (barMode === 'stacked') {
        // Определяем порядок серий для этой колонки.
        // 'desc' — крупные сегменты у основания столбца (сортировка per-label),
        // 'asc'  — мелкие у основания,
        // 'none' — порядок как в seriesSet.
        const seriesForLabel =
          sortStackedSegments === 'none'
            ? seriesSet
            : [...seriesSet].sort((a, b) => {
                const va = map.get(a) || 0;
                const vb = map.get(b) || 0;
                return sortStackedSegments === 'desc' ? vb - va : va - vb;
              });

        let yOffset = 0;
        seriesForLabel.forEach((series) => {
          const value = map.get(series) || 0;
          if (value === 0) return;
          const barHeight = (value / yMax) * chartHeight;
          const y = margin.top + chartHeight - ((yOffset + value) / yMax) * chartHeight;
          const color = colorMap.get(series)!;
          const isActive = activeSeries === series;
          const opacity = activeSeries !== null ? (isActive ? 1 : dimOpacity) : 1;

          const x = xGroup + groupWidth * 0.15;
          const w = groupWidth * 0.7;

          const dataItem =
            data.find(
              (d) => d.label === label && (d.series ?? String(d.id)) === series
            ) || null;

          bars.push(
            <rect
              key={`${label}-${series}`}
              x={x}
              y={y}
              width={w}
              height={barHeight}
              fill={color}
              opacity={opacity}
              stroke={theme.bgSurface}
              strokeWidth={1}
              rx={2}
              data-histogram-interactive="true"
              {...interactiveHandlers(series, dataItem)}
              onClick={() => {
                if (dataItem && onBarClick) handleBarClick(dataItem);
              }}
              style={{
                transition: 'opacity 0.25s ease, filter 0.25s ease',
                cursor: onBarClick ? 'pointer' : 'default',
                touchAction: 'manipulation',
                filter: isActive
                  ? 'brightness(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.2))'
                  : 'none',
              }}
            />
          );

          const labelEl = renderValueLabel(
            value, x, y, w, barHeight,
            `${label}-${series}-val`,
          );
          if (labelEl) bars.push(labelEl as JSX.Element);

          yOffset += value;
        });
      } else {
        const totalBarArea = groupWidth * (1 - effectiveGroupGap);
        const innerBarWidth = totalBarArea / Math.max(seriesSet.length, 1);
        const offsetX = (groupWidth - totalBarArea) / 2;

        seriesSet.forEach((series, seriesIndex) => {
          const value = map.get(series) || 0;
          if (value === 0) return;
          const barHeight = (value / yMax) * chartHeight;
          const x = xGroup + offsetX + seriesIndex * innerBarWidth;
          const y = margin.top + chartHeight - barHeight;
          const color = colorMap.get(series)!;
          const isActive = activeSeries === series;
          const opacity = activeSeries !== null ? (isActive ? 1 : dimOpacity) : 1;

          const dataItem =
            data.find(
              (d) => d.label === label && (d.series ?? String(d.id)) === series
            ) || null;

          bars.push(
            <rect
              key={`${label}-${series}`}
              x={x}
              y={y}
              width={innerBarWidth}
              height={barHeight}
              fill={color}
              opacity={opacity}
              stroke={theme.bgSurface}
              strokeWidth={1}
              rx={2}
              data-histogram-interactive="true"
              {...interactiveHandlers(series, dataItem)}
              onClick={() => {
                if (dataItem && onBarClick) handleBarClick(dataItem);
              }}
              style={{
                transition: 'opacity 0.25s ease, filter 0.25s ease',
                cursor: onBarClick ? 'pointer' : 'default',
                touchAction: 'manipulation',
                filter: isActive
                  ? 'brightness(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.2))'
                  : 'none',
              }}
            />
          );

          const labelEl = renderValueLabel(
            value, x, y, innerBarWidth, barHeight,
            `${label}-${series}-val`,
          );
          if (labelEl) bars.push(labelEl as JSX.Element);
        });
      }
    });

    return bars;
  };

  const renderXAxis = () => {
    if (!showXAxis) return null;
    const elements: JSX.Element[] = [];

    labels.forEach((label, index) => {
      const x = margin.left + index * groupWidth + groupWidth / 2;
      elements.push(
        <text
          key={`x-${label}`}
          x={x}
          y={effectiveHeight - margin.bottom + (isMobile ? 16 : 20)}
          textAnchor="middle"
          fill={theme.textMuted}
          fontSize={effectiveAxisFontSize}
          style={{ userSelect: 'none' }}
        >
          {label}
        </text>
      );
      elements.push(
        <line
          key={`xline-${label}`}
          x1={margin.left + index * groupWidth}
          y1={margin.top}
          x2={margin.left + index * groupWidth}
          y2={effectiveHeight - margin.bottom}
          stroke={theme.border}
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />
      );
    });

    elements.push(
      <line
        key="x-axis"
        x1={margin.left}
        y1={effectiveHeight - margin.bottom}
        x2={effectiveWidth - margin.right}
        y2={effectiveHeight - margin.bottom}
        stroke={theme.text}
        strokeWidth={1.5}
      />
    );

    if (xAxisLabel && !isMobile) {
      elements.push(
        <text
          key="x-label"
          x={margin.left + chartWidth / 2}
          y={effectiveHeight - 6}
          textAnchor="middle"
          fill={theme.text}
          fontSize={effectiveAxisFontSize + 2}
          fontWeight="bold"
        >
          {xAxisLabel}
        </text>
      );
    }

    return elements;
  };

  const renderYAxis = () => {
    if (!showYAxis) return null;
    const elements: JSX.Element[] = [];
    const maxTick = Math.ceil(yMax / computedStepSize) * computedStepSize;
    for (let val = 0; val <= maxTick; val += computedStepSize) {
      const y = margin.top + chartHeight - (val / yMax) * chartHeight;
      elements.push(
        <text
          key={`y-${val}`}
          x={margin.left - 10}
          y={y + 4}
          textAnchor="end"
          fill={theme.textMuted}
          fontSize={effectiveAxisFontSize}
          style={{ userSelect: 'none' }}
        >
          {val}
        </text>
      );
      elements.push(
        <line
          key={`yline-${val}`}
          x1={margin.left}
          y1={y}
          x2={effectiveWidth - margin.right}
          y2={y}
          stroke={theme.border}
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />
      );
    }
    elements.push(
      <line
        key="y-axis"
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={effectiveHeight - margin.bottom}
        stroke={theme.text}
        strokeWidth={1.5}
      />
    );
    if (yAxisLabel && !isMobile) {
      elements.push(
        <text
          key="y-label"
          x={-margin.top - chartHeight / 2}
          y={effectiveAxisFontSize}
          transform="rotate(-90)"
          textAnchor="middle"
          fill={theme.text}
          fontSize={effectiveAxisFontSize + 2}
          fontWeight="bold"
        >
          {yAxisLabel}
        </text>
      );
    }
    return elements;
  };

  const renderLegend = () => {
    if (!showLegend) return null;
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: isMobile ? 8 : 16,
          padding: isMobile ? '6px 10px' : '8px 16px',
          flexWrap: 'wrap',
          background: theme.bgSurface,
          borderRadius: 6,
          marginBottom: 8,
          border: `1px solid ${theme.border}`,
        }}
      >
        {seriesSet.map((series) => {
          const color = colorMap.get(series)!;
          const isActive = activeSeries === series;
          const opacity = activeSeries !== null ? (isActive ? 1 : 0.5) : 1;

          // Ищем «репрезентативный» item для колбэка
          const sampleItem =
            data.find((d) => (d.series ?? String(d.id)) === series) ?? null;

          return (
            <div
              key={series}
              data-histogram-interactive="true"
              {...interactiveHandlers(series, sampleItem)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 4,
                backgroundColor: isActive ? theme.navHoverBg : 'transparent',
                transition: 'background 0.2s, opacity 0.25s',
                opacity,
                touchAction: 'manipulation',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: effectiveAxisFontSize, color: theme.text }}>
                {series}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: theme.textMuted }}>
        Нет данных
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {renderLegend()}
      <svg
        width={effectiveWidth}
        height={effectiveHeight}
        style={{
          display: 'block',
          margin: '0 auto',
          maxWidth: '100%',
          touchAction: 'manipulation',
        }}
        viewBox={`0 0 ${effectiveWidth} ${effectiveHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g>
          {renderYAxis()}
          {renderXAxis()}
          {renderBars()}
        </g>
      </svg>
    </div>
  );
}