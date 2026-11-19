// PieChart.tsx — многоуровневая кольцевая диаграмма (sunburst) с легендой.
import React, { useState, useMemo, useRef } from 'react';
import type { Theme } from '../../themes/theme';
import { useResponsive } from '../../context/AppContext';
import { useResizeObserver } from '../../hooks';
import { getColorById, useDismissOnOutsideTap } from './shared';

/** Узел данных (дерево через parent). */
export interface PieDataItem {
  id: string | number;
  label: string;
  value: number;
  parent?: string | number | null;
  /** Уровень кольца (0 — внутреннее). */
  level: number;
  color?: string;
}

export type PieChartMargin = number | { top?: number; right?: number; bottom?: number; left?: number };

export interface PieChartProps {
  /** Данные. */
  data: PieDataItem[];
  /** Ширина (десктоп). @default 600 */
  width?: number;
  /** Высота (десктоп). @default 400 */
  height?: number;
  /** Тема оформления. */
  theme: Theme;
  /** Легенда. @default true */
  showLegend?: boolean;
  /** Позиция легенды (мобильный — всегда снизу). @default 'right' */
  legendPosition?: 'left' | 'right';
  /** Подписи на сегментах (десктоп). */
  showLabels?: boolean;
  /** Шрифт подписей. @default 10 */
  labelFontSize?: number;
  /** Ориентация подписей. @default 'radial' */
  labelOrientation?: 'radial' | 'radial90' | 'horizontal';
  /** Внутренний радиус (донат). @default 30 */
  innerRadius?: number;
  /** Толщина кольца. @default 28 */
  ringThickness?: number;
  /** Прозрачность неактивных сегментов. @default 0.3 */
  dimOpacity?: number;
  /** Hover/тап по сегменту. */
  onSegmentHover?: (item: PieDataItem | null) => void;
  /** Снимать выделение тапом вне. @default true */
  dismissOnOutsideTap?: boolean;
  /** Отступы. @default 20 */
  margin?: PieChartMargin;
  /** Зазор между графиком и легендой. @default 12 */
  legendGap?: number;
  /** Показывать значения в легенде. */
  showLegendValues?: boolean;
  /** Разделитель значения и процента. @default ' - ' */
  legendValueSeparator?: string;
}

interface TreeNode extends PieDataItem { children: TreeNode[]; startAngle: number; endAngle: number; }

function buildTree(data: PieDataItem[]): TreeNode[] {
  const map = new Map<string | number, TreeNode>();
  const roots: TreeNode[] = [];
  data.forEach((item) => map.set(item.id, { ...item, children: [], startAngle: 0, endAngle: 0 }));
  data.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parent == null) roots.push(node);
    else {
      const parent = map.get(item.parent);
      if (parent) parent.children.push(node); else roots.push(node);
    }
  });
  return roots;
}

/** Чистая функция: копии дерева с углами (StrictMode-safe). */
function withAngles(nodes: TreeNode[], start: number, end: number): TreeNode[] {
  const total = nodes.reduce((s, n) => s + n.value, 0);
  if (total === 0) {
    return nodes.map((n) => ({ ...n, startAngle: start, endAngle: start, children: withAngles(n.children, start, start) }));
  }
  let cur = start;
  return nodes.map((n) => {
    const span = (end - start) * (n.value / total);
    const result: TreeNode = { ...n, startAngle: cur, endAngle: cur + span, children: withAngles(n.children, cur, cur + span) };
    cur += span;
    return result;
  });
}

/** BFS-обход без shift() — O(n). */
function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const queue = [...nodes];
  for (let i = 0; i < queue.length; i++) queue.push(...queue[i].children);
  return queue;
}

const polar = (cx: number, cy: number, r: number, a: number) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });

function describeArc(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  // Полный круг вырождается в нулевую дугу — оставляем микрозазор.
  const end = endAngle - startAngle >= Math.PI * 2 - 1e-6 ? startAngle + Math.PI * 2 - 1e-4 : endAngle;
  const so = polar(cx, cy, outerR, startAngle), eo = polar(cx, cy, outerR, end);
  const si = polar(cx, cy, innerR, startAngle), ei = polar(cx, cy, innerR, end);
  const largeArc = end - startAngle > Math.PI ? 1 : 0;
  return [
    'M', so.x, so.y,
    'A', outerR, outerR, 0, largeArc, 1, eo.x, eo.y,
    'L', ei.x, ei.y,
    'A', innerR, innerR, 0, largeArc, 0, si.x, si.y,
    'Z',
  ].join(' ');
}

/** Кольцевая диаграмма с деревом уровней, донат-центром и адаптивной легендой. */
export function PieChart({
  data, width = 600, height = 400, theme,
  showLegend = true, legendPosition = 'right', showLabels = false,
  labelFontSize = 10, labelOrientation = 'radial',
  innerRadius = 30, ringThickness = 28, dimOpacity = 0.3,
  onSegmentHover, dismissOnOutsideTap = true, margin: marginProp = 20,
  legendGap = 12, showLegendValues = false, legendValueSeparator = ' - ',
}: PieChartProps) {
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const { isMobile } = useResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: measuredWidth } = useResizeObserver(containerRef);
  const useMeasured = isMobile && measuredWidth > 0;
  const effectiveWidth = useMeasured ? Math.max(320, measuredWidth - 16) : width;
  const effectiveHeight = useMeasured ? Math.max(280, Math.min(effectiveWidth * 0.95, 400)) : height;
  const effectiveLegendPosition: 'left' | 'right' | 'bottom' = isMobile ? 'bottom' : legendPosition;
  const effectiveLabelFontSize = isMobile ? Math.max(8, labelFontSize - 1) : labelFontSize;
  const effectiveShowLabels = isMobile ? false : showLabels;
  const effectiveRingThickness = isMobile ? Math.max(18, ringThickness - 6) : ringThickness;

  const margin = useMemo(() => typeof marginProp === 'number'
    ? { top: marginProp, right: marginProp, bottom: marginProp, left: marginProp }
    : { top: marginProp.top ?? 20, right: marginProp.right ?? 20, bottom: marginProp.bottom ?? 20, left: marginProp.left ?? 20 },
    [marginProp]);

  const roots = useMemo(() => buildTree(data), [data]);
  const rootsWithAngles = useMemo(() => withAngles(roots, 0, Math.PI * 2), [roots]);
  const totalRootValue = useMemo(() => rootsWithAngles.reduce((s, r) => s + r.value, 0), [rootsWithAngles]);
  const allNodes = useMemo(() => flattenTree(rootsWithAngles), [rootsWithAngles]);
  const nodesById = useMemo(() => {
    const m = new Map<string | number, TreeNode>();
    for (const n of allNodes) m.set(n.id, n);
    return m;
  }, [allNodes]);
  const nodeColorMap = useMemo(() => {
    const m = new Map<string | number, string>();
    for (const n of allNodes) m.set(n.id, n.color || getColorById(n.id));
    return m;
  }, [allNodes]);

  const setActive = (node: TreeNode | null) => {
    setActiveId(node ? node.id : null);
    onSegmentHover?.(node);
  };
  useDismissOnOutsideTap(dismissOnOutsideTap, () => setActive(null), '[data-pie-interactive]');

  const interactiveHandlers = (node: TreeNode) => ({
    onPointerDown: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') return; e.stopPropagation(); setActive(node); },
    onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === 'touch') return; setActive(node); },
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === 'touch') return; setActive(null); },
  });

  const hoveredNode = activeId != null ? nodesById.get(activeId) : undefined;
  const centerLabel = hoveredNode ? hoveredNode.label : 'Всего';
  const centerValue = hoveredNode ? hoveredNode.value : totalRootValue;

  const legendWidth = showLegend && effectiveLegendPosition !== 'bottom' ? 200 : 0;
  const chartWidth = effectiveWidth - margin.left - margin.right - legendWidth - (legendWidth ? legendGap : 0);
  const chartHeight = effectiveHeight - margin.top - margin.bottom;
  const cx = margin.left + chartWidth / 2;
  const cy = margin.top + chartHeight / 2;
  const maxRadius = Math.min(chartWidth, chartHeight) / 2;
  const maxLevel = Math.max(...allNodes.map((n) => n.level), 0);
  const scale = Math.min(1, maxRadius / (innerRadius + (maxLevel + 1) * effectiveRingThickness + 10));
  const scaledInner = innerRadius * scale;
  const scaledThickness = effectiveRingThickness * scale;

  const renderArcs = () => allNodes.map((node) => {
    const span = node.endAngle - node.startAngle;
    if (span <= 0) return null;
    const color = nodeColorMap.get(node.id)!;
    const isActive = activeId === node.id;
    const opacity = activeId !== null ? (isActive ? 1 : dimOpacity) : 0.85;
    const outerR = scaledInner + (node.level + 1) * scaledThickness;
    const innerR = scaledInner + node.level * scaledThickness;
    const offset = isActive ? 4 : 0;
    const d = describeArc(cx, cy, innerR + offset, outerR + offset, node.startAngle, node.endAngle);
    const midAngle = (node.startAngle + node.endAngle) / 2;
    const labelRadius = (innerR + outerR) / 2;
    const labelX = cx + labelRadius * Math.cos(midAngle);
    const labelY = cy + labelRadius * Math.sin(midAngle);
    const showLabel = effectiveShowLabels && span > 0.15;
    let labelTransform = '';
    if (showLabel && labelOrientation !== 'horizontal') {
      const angleDeg = (midAngle * 180) / Math.PI;
      if (labelOrientation === 'radial90') {
        let rot = angleDeg + 270;
        if (midAngle > Math.PI && midAngle < 2 * Math.PI) rot += 180;
        labelTransform = `rotate(${rot}, ${labelX}, ${labelY})`;
      } else {
        let rot = angleDeg;
        if (midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2) rot += 180;
        labelTransform = `rotate(${rot}, ${labelX}, ${labelY})`;
      }
    }
    return (
      <g key={node.id}>
        <path d={d} fill={color} stroke={theme.bgSurface} strokeWidth={1.5} opacity={opacity}
          data-pie-interactive="true" {...interactiveHandlers(node)}
          style={{
            transition: 'opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease',
            cursor: 'pointer', touchAction: 'manipulation',
            filter: isActive ? 'brightness(1.1) drop-shadow(0 0 8px rgba(255,255,255,0.15))' : 'none',
          }} />
        {showLabel && (
          <text x={labelX} y={labelY} fill={theme.text} fontSize={effectiveLabelFontSize}
            textAnchor="middle" dominantBaseline="central" pointerEvents="none" transform={labelTransform}
            style={{ userSelect: 'none', opacity, transition: 'opacity 0.25s ease' }}>
            {node.label}
          </text>
        )}
      </g>
    );
  });

  const renderLegend = () => {
    if (!showLegend) return null;
    const isBottom = effectiveLegendPosition === 'bottom';
    const legendItems = rootsWithAngles.map((node) => {
      const isActive = activeId === node.id;
      const percent = totalRootValue > 0 ? ((node.value / totalRootValue) * 100).toFixed(1) : '0.0';
      return (
        <div key={node.id} data-pie-interactive="true" {...interactiveHandlers(node)}
          style={{
            display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
            backgroundColor: isActive ? theme.navHoverBg : 'transparent',
            transition: 'background 0.2s, opacity 0.25s ease',
            fontSize: isBottom ? 12 : 13, color: theme.text, gap: 6,
            opacity: activeId !== null ? (isActive ? 1 : 0.5) : 1,
            flex: isBottom ? '0 0 calc(50% - 4px)' : undefined, minWidth: 0, touchAction: 'manipulation',
          }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, backgroundColor: nodeColorMap.get(node.id)!, flexShrink: 0 }} />
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{node.label}</span>
          <span style={{ color: theme.textMuted, fontSize: 11, whiteSpace: 'nowrap' }}>
            {showLegendValues ? `${node.value}${legendValueSeparator}${percent}%` : `${percent}%`}
          </span>
        </div>
      );
    });
    return (
      <div style={{
        width: isBottom ? '100%' : legendWidth,
        height: isBottom ? 'auto' : effectiveHeight - margin.top - margin.bottom,
        maxHeight: isBottom ? 180 : undefined,
        overflowY: 'auto', overflowX: 'hidden', paddingRight: isBottom ? 0 : 4,
        display: 'flex', flexDirection: isBottom ? 'row' : 'column', flexWrap: isBottom ? 'wrap' : 'nowrap', gap: 4,
        marginLeft: effectiveLegendPosition === 'right' ? legendGap : 0,
        marginRight: effectiveLegendPosition === 'left' ? legendGap : 0,
        marginTop: isBottom ? legendGap : 0,
      }}>
        {legendItems}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: theme.textMuted }}>Нет данных</div>;
  }
  return (
    <div ref={containerRef} style={{
      display: 'flex', flexDirection: effectiveLegendPosition === 'bottom' ? 'column' : 'row',
      alignItems: 'center', justifyContent: 'center', gap: 0, width: '100%', WebkitTapHighlightColor: 'transparent',
    }}>
      {effectiveLegendPosition === 'left' && renderLegend()}
      <svg width={chartWidth + margin.left + margin.right} height={effectiveHeight}
        style={{ flexShrink: 0, maxWidth: '100%', touchAction: 'manipulation' }}
        viewBox={`0 0 ${chartWidth + margin.left + margin.right} ${effectiveHeight}`}
        preserveAspectRatio="xMidYMid meet">
        <g>
          {renderArcs()}
          <g style={{ pointerEvents: 'none', transition: 'opacity 0.25s' }}>
            <circle cx={cx} cy={cy} r={Math.max(scaledInner - 2, 0)} fill={theme.bgSurface} stroke={theme.border} strokeWidth={2} />
            <text x={cx} y={cy - 12} textAnchor="middle" dominantBaseline="central"
              fill={theme.text} fontSize={effectiveLabelFontSize + 10} fontWeight="bold">{centerValue}</text>
            <text x={cx} y={cy + 20} textAnchor="middle" dominantBaseline="central"
              fill={theme.textMuted} fontSize={effectiveLabelFontSize + 6}>{centerLabel}</text>
          </g>
        </g>
      </svg>
      {effectiveLegendPosition !== 'left' && renderLegend()}
    </div>
  );
}