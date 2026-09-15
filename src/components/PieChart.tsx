import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Theme } from '../themes/theme';
import { useResponsive } from '../context/ResponsiveContext';
import { useResizeObserver } from '../hooks/useResizeObserver';

// ─── Типы данных ──────────────────────────────────────────────

/**
 * Один сегмент диаграммы. Диаграмма поддерживает многоуровневую (иерархическую)
 * структуру: элементы с `parent = null` — корневые кольца, дети рисуются
 * вложенными кольцами внутри родительского сектора.
 */
export interface PieDataItem {
  /** Уникальный идентификатор. */
  id: string | number;

  /** Текстовая подпись сегмента (для легенды и центра). */
  label: string;

  /** Числовое значение. Пропорционально углу сектора. */
  value: number;

  /**
   * ID родительского элемента или null для корня.
   * Уровни (level) строятся автоматически по связям parent → child.
   */
  parent?: string | number | null;

  /**
   * Уровень вложенности. 0 — корень, 1 — первое кольцо детей, и т.д.
   * Используется для расчёта радиуса сегмента.
   */
  level: number;

  /**
   * Явный цвет сегмента. Если не указан — генерируется автоматически
   * по id (HSL с золотым сечением).
   */
  color?: string;
}

export interface PieChartProps {
  /**
   * Плоский массив сегментов. Иерархия задаётся через parent/level,
   * а не вложенными структурами.
   */
  data: PieDataItem[];

  /**
   * Ширина диаграммы (включая легенду), px.
   * На мобиле игнорируется — используется ширина контейнера.
   * @default 600
   */
  width?: number;

  /**
   * Высота диаграммы, px.
   * На мобиле вычисляется от ширины (примерно w * 0.95, не более 400).
   * @default 400
   */
  height?: number;

  /** Тема. Обязательна. */
  theme: Theme;

  /**
   * Показывать ли легенду.
   * @default true
   */
  showLegend?: boolean;

  /**
   * Положение легенды на десктопе.
   * На мобиле всегда принудительно 'bottom'.
   * @default 'right'
   */
  legendPosition?: 'left' | 'right';

  /**
   * Показывать ли текстовые подписи сегментов внутри колец.
   * На мобиле всегда false (нечитаемо).
   * @default false
   */
  showLabels?: boolean;

  /**
   * Размер шрифта подписей сегментов, px.
   * На мобиле автоматически уменьшается на 1.
   * @default 10
   */
  labelFontSize?: number;

  /**
   * Ориентация подписей на сегментах:
   *  - 'radial' — вдоль радиуса, читается от центра;
   *  - 'radial90' — поворот 90°, читается «горизонтально»;
   *  - 'horizontal' — без поворота.
   * @default 'radial'
   */
  labelOrientation?: 'radial' | 'radial90' | 'horizontal';

  /**
   * Внутренний радиус центрального «бублика», px.
   * Задаёт «пустоту» в центре, где рисуется центр-лейбл.
   * @default 30
   */
  innerRadius?: number;

  /**
   * Толщина одного кольца (одного уровня), px.
   * @default 28
   */
  ringThickness?: number;

  /**
   * Непрозрачность неактивных сегментов при выделении одного
   * (0..1). Меньше — сильнее затемнение остальных.
   * @default 0.3
   */
  dimOpacity?: number;

  /**
   * Колбэк при наведении (мышь) или тапе (палец) на сегмент
   * или на элемент легенды.
   * Получает сам элемент или null, когда выделение сброшено.
   */
  onSegmentHover?: (item: PieDataItem | null) => void;

  /**
   * Снимать ли выделение при тапе в любом месте вне диаграммы.
   * Работает только для тач-устройств (pointerType !== 'mouse').
   * На десктопе выделение снимается само на mouseleave.
   * @default true
   */
  dismissOnOutsideTap?: boolean;
}

// ─── Вспомогательные функции ──────────────────────────────────

function getColorById(id: string | number): string {
  if (typeof id === 'string' && id.startsWith('#')) return id;
  const num = typeof id === 'number' ? id : parseInt(id, 36);
  const phi = 0.618033988749895;
  const hue = (num * phi) % 1.0;
  return `hsl(${hue * 360}, 70%, 55%)`;
}

interface TreeNode extends PieDataItem {
  children: TreeNode[];
  startAngle: number;
  endAngle: number;
}

function buildTree(data: PieDataItem[]): TreeNode[] {
  const map = new Map<string | number, TreeNode>();
  const roots: TreeNode[] = [];

  data.forEach((item) => {
    const node: TreeNode = {
      ...item,
      children: [],
      startAngle: 0,
      endAngle: 0,
    };
    map.set(item.id, node);
  });

  data.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parent == null) {
      roots.push(node);
    } else {
      const parent = map.get(item.parent);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  return roots;
}

function computeAngles(nodes: TreeNode[], startAngle: number, endAngle: number): void {
  if (nodes.length === 0) return;
  const total = nodes.reduce((sum, n) => sum + n.value, 0);
  if (total === 0) return;

  let currentStart = startAngle;
  nodes.forEach((node) => {
    const fraction = node.value / total;
    const angleSpan = (endAngle - startAngle) * fraction;
    node.startAngle = currentStart;
    node.endAngle = currentStart + angleSpan;
    currentStart += angleSpan;
    if (node.children.length > 0) {
      computeAngles(node.children, node.startAngle, node.endAngle);
    }
  });
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  let result: TreeNode[] = [];
  nodes.forEach((node) => {
    result.push(node);
    result = result.concat(flattenTree(node.children));
  });
  return result;
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function describeArc(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, endAngle);

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRadius, outerRadius, 0, largeArc, 1, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, largeArc, 0, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

// ─── Основной компонент ──────────────────────────────────────

export function PieChart({
  data,
  width = 600,
  height = 400,
  theme,
  showLegend = true,
  legendPosition = 'right',
  showLabels = false,
  labelFontSize = 10,
  labelOrientation = 'radial',
  innerRadius = 30,
  ringThickness = 28,
  dimOpacity = 0.3,
  onSegmentHover,
  dismissOnOutsideTap = true,
}: PieChartProps) {
  // «Активный» — то, что подсвечено. Может быть установлен hover'ом мыши
  // или tap'ом пальца. Работает одинаково для обоих сценариев.
  const [activeId, setActiveId] = useState<string | number | null>(null);

  const { isMobile } = useResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: measuredWidth } = useResizeObserver(containerRef);

  const useMeasured = isMobile && measuredWidth > 0;
  const effectiveWidth = useMeasured ? Math.max(320, measuredWidth - 16) : width;
  const effectiveHeight = useMeasured
    ? Math.max(280, Math.min(effectiveWidth * 0.95, 400))
    : height;

  const effectiveLegendPosition: 'left' | 'right' | 'bottom' = isMobile
    ? 'bottom'
    : legendPosition;

  const effectiveLabelFontSize = isMobile ? Math.max(8, labelFontSize - 1) : labelFontSize;
  const effectiveShowLabels = isMobile ? false : showLabels;

  const roots = useMemo(() => buildTree(data), [data]);
  const totalRootValue = useMemo(
    () => roots.reduce((sum, r) => sum + r.value, 0),
    [roots]
  );

  // NOTE: сохраняем оригинальное поведение (side-effect в useMemo)
  useMemo(() => {
    let start = 0;
    roots.forEach((root) => {
      const fraction = root.value / totalRootValue;
      root.startAngle = start;
      root.endAngle = start + fraction * 2 * Math.PI;
      start += fraction * 2 * Math.PI;
      if (root.children.length > 0) {
        computeAngles(root.children, root.startAngle, root.endAngle);
      }
    });
  }, [roots, totalRootValue]);

  const allNodes = useMemo(() => flattenTree(roots), [roots]);

  const nodeColorMap = useMemo(() => {
    const map = new Map<string | number, string>();
    allNodes.forEach((node) => {
      map.set(node.id, node.color || getColorById(node.id));
    });
    return map;
  }, [allNodes]);

  // ─── Общий обработчик установки активного элемента ───────
  const setActive = (node: TreeNode | null) => {
    setActiveId(node ? node.id : null);
    if (onSegmentHover) onSegmentHover(node);
  };

  // ─── Тап вне интерактивных элементов снимает выделение ───
  useEffect(() => {
    if (!dismissOnOutsideTap) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (target.closest('[data-pie-interactive]')) return;
      setActiveId(null);
      if (onSegmentHover) onSegmentHover(null);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [dismissOnOutsideTap, onSegmentHover]);

  // ─── Сегмент ─────────────────────────────────────────────
  const segmentHandlers = (node: TreeNode) => ({
    onPointerDown: (e: React.PointerEvent) => {
      // Для мыши pointerdown не нужен — уже работает hover.
      // Для тача — tap фиксирует выделение.
      if (e.pointerType === 'mouse') return;
      e.stopPropagation();
      setActive(node);
    },
    onPointerEnter: (e: React.PointerEvent) => {
      // Hover только для мыши/пера: на таче pointerenter срабатывает
      // на каждый новый элемент при движении пальца — не нужно.
      if (e.pointerType === 'touch') return;
      setActive(node);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      // Уходим с сегмента, но активный остаётся, если пользователь кликнул,
      // а не навёл. Определяем по типу pointer.
      setActive(null);
    },
    onPointerCancel: () => {
      // На таче, если жест превратился в скролл, браузер шлёт pointercancel.
      // Не снимаем выделение — пользователь может продолжать смотреть.
    },
  });

  // ─── Легенда ─────────────────────────────────────────────
  const legendHandlers = (node: TreeNode) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      e.stopPropagation();
      setActive(node);
    },
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setActive(node);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setActive(null);
    },
  });

  const hoveredNode = allNodes.find((n) => n.id === activeId);
  const centerLabel = hoveredNode ? hoveredNode.label : 'Всего';
  const centerValue = hoveredNode ? hoveredNode.value : totalRootValue;

  // Размеры и масштаб
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const legendWidth = showLegend && effectiveLegendPosition !== 'bottom' ? 200 : 0;
  const legendGap = 12;
  const chartWidth =
    effectiveWidth - margin.left - margin.right - legendWidth - (legendWidth ? legendGap : 0);
  const chartHeight = effectiveHeight - margin.top - margin.bottom;
  const cx = margin.left + chartWidth / 2;
  const cy = margin.top + chartHeight / 2;
  const maxRadius = Math.min(chartWidth, chartHeight) / 2;
  const maxLevel = Math.max(...allNodes.map((n) => n.level), 0);
  const totalThickness = (maxLevel + 1) * ringThickness;
  const scale = Math.min(1, maxRadius / (innerRadius + totalThickness + 10));
  const scaledInner = innerRadius * scale;
  const scaledThickness = ringThickness * scale;

  const renderArcs = () => {
    return allNodes.map((node) => {
      const color = nodeColorMap.get(node.id)!;
      const isActive = activeId === node.id;

      let opacity = 0.85;
      if (activeId !== null) {
        opacity = isActive ? 1 : dimOpacity;
      }

      const outerR = scaledInner + (node.level + 1) * scaledThickness;
      const innerR = scaledInner + node.level * scaledThickness;
      const offset = isActive ? 4 : 0;
      const outerOffset = outerR + offset;
      const innerOffset = innerR + offset;

      const d = describeArc(cx, cy, innerOffset, outerOffset, node.startAngle, node.endAngle);

      const midAngle = (node.startAngle + node.endAngle) / 2;
      const labelRadius = (innerR + outerR) / 2;
      const labelX = cx + labelRadius * Math.cos(midAngle);
      const labelY = cy + labelRadius * Math.sin(midAngle);

      let labelTransform = '';

      if (effectiveShowLabels && node.endAngle - node.startAngle > 0.15) {
        const angleDeg = (midAngle * 180) / Math.PI;
        const isLeftHalf = midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2;
        const isDownHalf = midAngle > Math.PI && midAngle < 2 * Math.PI;

        if (labelOrientation === 'horizontal') {
          labelTransform = '';
        } else if (labelOrientation === 'radial90') {
          let rot = angleDeg + 270;
          if (isDownHalf) rot += 180;
          labelTransform = `rotate(${rot}, ${labelX}, ${labelY})`;
        } else {
          let rot = angleDeg;
          if (isLeftHalf) rot += 180;
          labelTransform = `rotate(${rot}, ${labelX}, ${labelY})`;
        }
      }

      return (
        <g key={node.id}>
          <path
            d={d}
            fill={color}
            stroke={theme.bgSurface}
            strokeWidth={1.5}
            opacity={opacity}
            data-pie-interactive="true"
            {...segmentHandlers(node)}
            style={{
              transition: 'opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease',
              cursor: 'pointer',
              // Разрешаем тач-жесты: вертикальный скролл страницы,
              // если пользователь начал жест на диаграмме.
              touchAction: 'manipulation',
              filter: isActive
                ? 'brightness(1.1) drop-shadow(0 0 8px rgba(255,255,255,0.15))'
                : 'none',
            }}
          />
          {effectiveShowLabels && node.endAngle - node.startAngle > 0.15 && (
            <text
              x={labelX}
              y={labelY}
              fill={theme.text}
              fontSize={effectiveLabelFontSize}
              textAnchor="middle"
              dominantBaseline="central"
              pointerEvents="none"
              transform={labelTransform}
              style={{ userSelect: 'none', opacity, transition: 'opacity 0.25s ease' }}
            >
              {node.label}
            </text>
          )}
        </g>
      );
    });
  };

  const renderLegend = () => {
    if (!showLegend) return null;

    const isBottom = effectiveLegendPosition === 'bottom';
    const rootNodes = roots;

    const legendItems = rootNodes.map((node) => {
      const isActive = activeId === node.id;
      const color = nodeColorMap.get(node.id)!;
      const percent = ((node.value / totalRootValue) * 100).toFixed(1);

      let legendOpacity = 1;
      if (activeId !== null) {
        legendOpacity = isActive ? 1 : 0.5;
      }

      return (
        <div
          key={node.id}
          data-pie-interactive="true"
          {...legendHandlers(node)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            backgroundColor: isActive ? theme.navHoverBg : 'transparent',
            transition: 'background 0.2s, opacity 0.25s ease',
            fontSize: isBottom ? 12 : 13,
            color: theme.text,
            gap: 6,
            opacity: legendOpacity,
            flex: isBottom ? '0 0 calc(50% - 4px)' : undefined,
            minWidth: 0,
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
          <span
            style={{
              flex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
          >
            {node.label}
          </span>
          <span style={{ color: theme.textMuted, fontSize: 11 }}>{percent}%</span>
        </div>
      );
    });

    const style: React.CSSProperties = {
      width: isBottom ? '100%' : legendWidth,
      height: isBottom ? 'auto' : effectiveHeight - margin.top - margin.bottom,
      maxHeight: isBottom ? 180 : undefined,
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingRight: isBottom ? 0 : 4,
      display: 'flex',
      flexDirection: isBottom ? 'row' : 'column',
      flexWrap: isBottom ? 'wrap' : 'nowrap',
      gap: 4,
      marginLeft: effectiveLegendPosition === 'right' ? legendGap : 0,
      marginRight: effectiveLegendPosition === 'left' ? legendGap : 0,
    };

    return <div style={style}>{legendItems}</div>;
  };

  const renderCenter = () => (
    <circle
      cx={cx}
      cy={cy}
      r={Math.max(scaledInner - 2, 0)}
      fill={theme.bgSurface}
      stroke={theme.border}
      strokeWidth={2}
      style={{ transition: 'opacity 0.25s' }}
    />
  );

  const renderCenterText = () => (
    <text
      x={cx}
      y={cy - 12}
      textAnchor="middle"
      dominantBaseline="central"
      fill={theme.text}
      fontSize={effectiveLabelFontSize + 10}
      fontWeight="bold"
      style={{ pointerEvents: 'none', transition: 'opacity 0.25s' }}
    >
      {centerValue}
    </text>
  );

  const renderCenterLabel = () => (
    <text
      x={cx}
      y={cy + 20}
      textAnchor="middle"
      dominantBaseline="central"
      fill={theme.textMuted}
      fontSize={effectiveLabelFontSize + 6}
      style={{ pointerEvents: 'none', transition: 'opacity 0.25s' }}
    >
      {centerLabel}
    </text>
  );

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
        display: 'flex',
        flexDirection: effectiveLegendPosition === 'bottom' ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: effectiveLegendPosition === 'bottom' ? 8 : 0,
        width: '100%',
        // На тач-устройствах не выделяем текст и не даём случайных зумов
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {effectiveLegendPosition === 'left' && renderLegend()}
      <svg
        width={chartWidth + margin.left + margin.right}
        height={effectiveHeight}
        style={{ flexShrink: 0, maxWidth: '100%', touchAction: 'manipulation' }}
        viewBox={`0 0 ${chartWidth + margin.left + margin.right} ${effectiveHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g>
          {renderArcs()}
          {renderCenter()}
          {renderCenterText()}
          {renderCenterLabel()}
        </g>
      </svg>
      {effectiveLegendPosition === 'right' && renderLegend()}
      {effectiveLegendPosition === 'bottom' && renderLegend()}
    </div>
  );
}