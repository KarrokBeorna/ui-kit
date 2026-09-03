import React, { useState, useMemo } from 'react';
import { Theme } from '../themes/theme';

// ─── Типы данных ──────────────────────────────────────────────

export interface PieDataItem {
  id: string | number;
  label: string;
  value: number;
  parent?: string | number | null;
  level: number;
  color?: string;
}

export interface PieChartProps {
  /** Массив элементов данных (плоская структура с parent) */
  data: PieDataItem[];
  /** Ширина диаграммы (включая легенду) */
  width?: number;
  /** Высота диаграммы */
  height?: number;
  /** Тема приложения */
  theme: Theme;
  /** Показывать ли легенду */
  showLegend?: boolean;
  /** Положение легенды - слева/справа */
  legendPosition?: 'left' | 'right';
  /** Показывать ли текстовые метки на секторах */
  showLabels?: boolean;
  /** Размер шрифта подписей */
  labelFontSize?: number;
  /** Направление подписей на сегментах */
  labelOrientation?: 'radial' | 'radial90' | 'horizontal';
  /** Внутренний радиус для корневого уровня */
  innerRadius?: number;
  /** Толщина одного кольца (уровня) */
  ringThickness?: number;
  /** Прозрачность сегментов во время hover'а на один из сегментов */
  dimOpacity?: number;
  /** Колбэк при наведении на сегмент */
  onSegmentHover?: (item: PieDataItem | null) => void;
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

  data.forEach(item => {
    const node: TreeNode = {
      ...item,
      children: [],
      startAngle: 0,
      endAngle: 0,
    };
    map.set(item.id, node);
  });

  data.forEach(item => {
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

function computeAngles(
  nodes: TreeNode[],
  startAngle: number,
  endAngle: number
): void {
  if (nodes.length === 0) return;
  const total = nodes.reduce((sum, n) => sum + n.value, 0);
  if (total === 0) return;

  let currentStart = startAngle;
  nodes.forEach(node => {
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
  nodes.forEach(node => {
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
}: PieChartProps) {
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);

  // Построение дерева
  const roots = useMemo(() => buildTree(data), [data]);
  const totalRootValue = useMemo(
    () => roots.reduce((sum, r) => sum + r.value, 0),
    [roots]
  );

  // Вычисление углов
  useMemo(() => {
    let start = 0;
    roots.forEach(root => {
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

  // Цвета
  const nodeColorMap = useMemo(() => {
    const map = new Map<string | number, string>();
    allNodes.forEach(node => {
      map.set(node.id, node.color || getColorById(node.id));
    });
    return map;
  }, [allNodes]);

  // Обработчики наведения
  const handleMouseEnter = (node: TreeNode) => {
    setHoveredId(node.id);
    if (onSegmentHover) onSegmentHover(node);
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
    if (onSegmentHover) onSegmentHover(null);
  };

  const hoveredNode = allNodes.find(n => n.id === hoveredId);
  const centerLabel = hoveredNode ? hoveredNode.label : 'Всего';
  const centerValue = hoveredNode ? hoveredNode.value : totalRootValue;

  // Размеры и масштаб
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const legendWidth = showLegend ? 200 : 0;
  const legendGap = 12;
  const chartWidth = width - margin.left - margin.right - legendWidth - (showLegend ? legendGap : 0);
  const chartHeight = height - margin.top - margin.bottom;
  const cx = margin.left + chartWidth / 2;
  const cy = margin.top + chartHeight / 2;
  const maxRadius = Math.min(chartWidth, chartHeight) / 2;
  const maxLevel = Math.max(...allNodes.map(n => n.level), 0);
  const totalThickness = (maxLevel + 1) * ringThickness;
  const scale = Math.min(1, maxRadius / (innerRadius + totalThickness + 10));
  const scaledInner = innerRadius * scale;
  const scaledThickness = ringThickness * scale;

  // Рендер дуг
  const renderArcs = () => {
    return allNodes.map(node => {
      const color = nodeColorMap.get(node.id)!;
      const isHovered = hoveredId === node.id;

      // Определяем непрозрачность: если ничего не выбрано – 0.85, иначе для выбранного 1, для остальных dimOpacity
      let opacity = 0.85;
      if (hoveredId !== null) {
        opacity = isHovered ? 1 : dimOpacity;
      }

      const outerR = scaledInner + (node.level + 1) * scaledThickness;
      const innerR = scaledInner + node.level * scaledThickness;
      const offset = isHovered ? 4 : 0;
      const outerOffset = outerR + offset;
      const innerOffset = innerR + offset;

      const d = describeArc(
        cx, cy,
        innerOffset,
        outerOffset,
        node.startAngle,
        node.endAngle
      );

      const midAngle = (node.startAngle + node.endAngle) / 2;
      const labelRadius = (innerR + outerR) / 2;
      const labelX = cx + labelRadius * Math.cos(midAngle);
      const labelY = cy + labelRadius * Math.sin(midAngle);

      let labelTransform = '';

      if (showLabels && (node.endAngle - node.startAngle) > 0.15) {
        const angleDeg = midAngle * 180 / Math.PI;
        const isLeftHalf = midAngle > Math.PI / 2 && midAngle < 3 * Math.PI / 2;
        const isDownHalf = midAngle > Math.PI && midAngle < 2 * Math.PI;

        if (labelOrientation === 'horizontal') {
          labelTransform = '';
        } else if (labelOrientation === 'radial90') {
          let rot = angleDeg + 270;
          if (isDownHalf) {
            rot += 180;
          }
          labelTransform = `rotate(${rot}, ${labelX}, ${labelY})`;
        } else { // 'radial'
          let rot = angleDeg;
          if (isLeftHalf) {
            rot += 180;
          }
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
            style={{
              transition: 'opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease',
              cursor: 'pointer',
              filter: isHovered ? 'brightness(1.1) drop-shadow(0 0 8px rgba(255,255,255,0.15))' : 'none',
            }}
            onMouseEnter={() => handleMouseEnter(node)}
            onMouseLeave={handleMouseLeave}
          />
          {showLabels && (node.endAngle - node.startAngle) > 0.15 && (
            <text
              x={labelX}
              y={labelY}
              fill={theme.text}
              fontSize={labelFontSize}
              textAnchor="middle"
              dominantBaseline="central"
              pointerEvents="none"
              transform={labelTransform}
              style={{
                userSelect: 'none',
                opacity: opacity, // текст тоже затемняется вместе с сектором
                transition: 'opacity 0.25s ease',
              }}
            >
              {node.label}
            </text>
          )}
        </g>
      );
    });
  };

  // Легенда (только level === 0)
  const renderLegend = () => {
    if (!showLegend) return null;

    const rootNodes = roots;

    const legendItems = rootNodes.map(node => {
      const isHovered = hoveredId === node.id;
      const color = nodeColorMap.get(node.id)!;
      const percent = ((node.value / totalRootValue) * 100).toFixed(1);

      // Затемняем элементы легенды, если они не выделены
      let legendOpacity = 1;
      if (hoveredId !== null) {
        legendOpacity = isHovered ? 1 : 0.5;
      }

      return (
        <div
          key={node.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            backgroundColor: isHovered ? theme.navHoverBg : 'transparent',
            transition: 'background 0.2s, opacity 0.25s ease',
            fontSize: 13,
            color: theme.text,
            gap: 8,
            opacity: legendOpacity,
          }}
          onMouseEnter={() => handleMouseEnter(node)}
          onMouseLeave={handleMouseLeave}
        >
          <span
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              borderRadius: 3,
              backgroundColor: color,
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.label}
          </span>
          <span style={{ color: theme.textMuted, fontSize: 12 }}>{percent}%</span>
        </div>
      );
    });

    const style: React.CSSProperties = {
      width: legendWidth,
      height: height - margin.top - margin.bottom,
      overflowY: 'auto',
      paddingRight: 4,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      marginLeft: legendPosition === 'right' ? legendGap : 0,
      marginRight: legendPosition === 'left' ? legendGap : 0,
    };

    return <div style={style}>{legendItems}</div>;
  };

  // Центральный круг
  const renderCenter = () => (
    <circle
      cx={cx}
      cy={cy}
      r={scaledInner - 2}
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
      fontSize={labelFontSize + 10}
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
      fontSize={labelFontSize + 6}
      style={{ pointerEvents: 'none', transition: 'opacity 0.25s' }}
    >
      {centerLabel}
    </text>
  );

  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: theme.textMuted }}>Нет данных</div>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {legendPosition === 'left' && renderLegend()}
      <svg width={chartWidth + margin.left + margin.right} height={height} style={{ flexShrink: 0 }}>
        <g>
          {renderArcs()}
          {renderCenter()}
          {renderCenterText()}
          {renderCenterLabel()}
        </g>
      </svg>
      {legendPosition === 'right' && renderLegend()}
    </div>
  );
}