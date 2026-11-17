import React, { useState, useMemo, useRef } from 'react';
import { Theme } from '../../themes/theme';
import { useResponsive } from '../../context/ResponsiveContext';
import { useResizeObserver } from './_shared/useResizeObserver';
import { useDismissOnOutsideTap } from './_shared/useDismissOnOutsideTap';
import { getColorById } from './_shared/color';

// ─── Типы ─────────────────────────────────────────────────────

export interface PieDataItem {
  id: string | number;
  label: string;
  value: number;
  parent?: string | number | null;
  level: number;
  color?: string;
}

export type PieChartMargin =
  | number
  | { top?: number; right?: number; bottom?: number; left?: number };

export interface PieChartProps {
  data: PieDataItem[];
  width?: number;
  height?: number;
  theme: Theme;
  showLegend?: boolean;
  legendPosition?: 'left' | 'right';
  showLabels?: boolean;
  labelFontSize?: number;
  labelOrientation?: 'radial' | 'radial90' | 'horizontal';
  innerRadius?: number;
  ringThickness?: number;
  dimOpacity?: number;
  onSegmentHover?: (item: PieDataItem | null) => void;
  dismissOnOutsideTap?: boolean;
  margin?: PieChartMargin;
  legendGap?: number;
  showLegendValues?: boolean;
  legendValueSeparator?: string;
}

interface TreeNode extends PieDataItem {
  children: TreeNode[];
  startAngle: number;
  endAngle: number;
}

// ─── Вспомогательные ─────────────────────────────────────────

function buildTree(data: PieDataItem[]): TreeNode[] {
  const map = new Map<string | number, TreeNode>();
  const roots: TreeNode[] = [];

  data.forEach((item) => {
    map.set(item.id, {
      ...item,
      children: [],
      startAngle: 0,
      endAngle: 0,
    });
  });

  data.forEach((item) => {
    const node = map.get(item.id)!;
    if (item.parent == null) {
      roots.push(node);
    } else {
      const parent = map.get(item.parent);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  });

  return roots;
}

/**
 * Чистая функция: возвращает копии дерева с углами.
 * Никаких мутаций — безопасно в StrictMode / Concurrent Mode.
 */
function withAngles(
  nodes: TreeNode[],
  start: number,
  end: number
): TreeNode[] {
  const total = nodes.reduce((s, n) => s + n.value, 0);
  if (total === 0) {
    return nodes.map((n) => ({
      ...n,
      startAngle: start,
      endAngle: start,
      children: withAngles(n.children, start, start),
    }));
  }
  let cur = start;
  return nodes.map((n) => {
    const span = (end - start) * (n.value / total);
    const result: TreeNode = {
      ...n,
      startAngle: cur,
      endAngle: cur + span,
      children: withAngles(n.children, cur, cur + span),
    };
    cur += span;
    return result;
  });
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.shift()!;
    result.push(n);
    stack.push(...n.children);
  }
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

// ─── Компонент ────────────────────────────────────────────────

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
  margin: marginProp = 20,
  legendGap = 12,
  showLegendValues = false,
  legendValueSeparator = ' - ',
}: PieChartProps) {
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

  const effectiveLabelFontSize = isMobile
    ? Math.max(8, labelFontSize - 1)
    : labelFontSize;
  const effectiveShowLabels = isMobile ? false : showLabels;
  const effectiveRingThickness = isMobile
    ? Math.max(18, ringThickness - 6)
    : ringThickness;

  const margin = useMemo(() => {
    if (typeof marginProp === 'number') {
      return {
        top: marginProp,
        right: marginProp,
        bottom: marginProp,
        left: marginProp,
      };
    }
    return {
      top: marginProp.top ?? 20,
      right: marginProp.right ?? 20,
      bottom: marginProp.bottom ?? 20,
      left: marginProp.left ?? 20,
    };
  }, [marginProp]);

  const roots = useMemo(() => buildTree(data), [data]);
  const rootsWithAngles = useMemo(
    () => withAngles(roots, 0, Math.PI * 2),
    [roots]
  );
  const totalRootValue = useMemo(
    () => rootsWithAngles.reduce((s, r) => s + r.value, 0),
    [rootsWithAngles]
  );

  const allNodes = useMemo(() => flattenTree(rootsWithAngles), [rootsWithAngles]);

  const nodesById = useMemo(() => {
    const m = new Map<string | number, TreeNode>();
    for (const n of allNodes) m.set(n.id, n);
    return m;
  }, [allNodes]);

  const nodeColorMap = useMemo(() => {
    const m = new Map<string | number, string>();
    for (const n of allNodes) {
      m.set(n.id, n.color || getColorById(n.id));
    }
    return m;
  }, [allNodes]);

  const setActive = (node: TreeNode | null) => {
    setActiveId(node ? node.id : null);
    onSegmentHover?.(node);
  };

  useDismissOnOutsideTap(dismissOnOutsideTap, () => setActive(null), {
    selector: '[data-pie-interactive]',
  });

  // ─── Общие pointer handlers ─────────────────────────────────
  const interactiveHandlers = (node: TreeNode) => ({
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
    onPointerCancel: () => {},
  });

  const hoveredNode = activeId != null ? nodesById.get(activeId) : undefined;
  const centerLabel = hoveredNode ? hoveredNode.label : 'Всего';
  const centerValue = hoveredNode ? hoveredNode.value : totalRootValue;

  const legendWidth =
    showLegend && effectiveLegendPosition !== 'bottom' ? 200 : 0;
  const chartWidth =
    effectiveWidth -
    margin.left -
    margin.right -
    legendWidth -
    (legendWidth ? legendGap : 0);
  const chartHeight = effectiveHeight - margin.top - margin.bottom;
  const cx = margin.left + chartWidth / 2;
  const cy = margin.top + chartHeight / 2;
  const maxRadius = Math.min(chartWidth, chartHeight) / 2;
  const maxLevel = Math.max(...allNodes.map((n) => n.level), 0);
  const totalThickness = (maxLevel + 1) * effectiveRingThickness;
  const scale = Math.min(1, maxRadius / (innerRadius + totalThickness + 10));
  const scaledInner = innerRadius * scale;
  const scaledThickness = effectiveRingThickness * scale;

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

      const d = describeArc(
        cx,
        cy,
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

      if (effectiveShowLabels && node.endAngle - node.startAngle > 0.15) {
        const angleDeg = (midAngle * 180) / Math.PI;
        const isLeftHalf =
          midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2;
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
            {...interactiveHandlers(node)}
            style={{
              transition:
                'opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease',
              cursor: 'pointer',
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
              style={{
                userSelect: 'none',
                opacity,
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

  const renderLegend = () => {
    if (!showLegend) return null;

    const isBottom = effectiveLegendPosition === 'bottom';

    const legendItems = rootsWithAngles.map((node) => {
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
          {...interactiveHandlers(node)}
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
          <span
            style={{
              color: theme.textMuted,
              fontSize: 11,
              whiteSpace: 'nowrap',
            }}
          >
            {showLegendValues
              ? `${node.value}${legendValueSeparator}${percent}%`
              : `${percent}%`}
          </span>
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
      marginTop: isBottom ? legendGap : 0,
    };

    return <div style={style}>{legendItems}</div>;
  };

  const renderCenter = () => (
    <g style={{ pointerEvents: 'none', transition: 'opacity 0.25s' }}>
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(scaledInner - 2, 0)}
        fill={theme.bgSurface}
        stroke={theme.border}
        strokeWidth={2}
      />
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        dominantBaseline="central"
        fill={theme.text}
        fontSize={effectiveLabelFontSize + 10}
        fontWeight="bold"
      >
        {centerValue}
      </text>
      <text
        x={cx}
        y={cy + 20}
        textAnchor="middle"
        dominantBaseline="central"
        fill={theme.textMuted}
        fontSize={effectiveLabelFontSize + 6}
      >
        {centerLabel}
      </text>
    </g>
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
        gap: 0,
        width: '100%',
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
        </g>
      </svg>
      {effectiveLegendPosition === 'right' && renderLegend()}
      {effectiveLegendPosition === 'bottom' && renderLegend()}
    </div>
  );
}