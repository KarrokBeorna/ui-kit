import React, { useState } from "react";
import type { Theme } from '../themes/theme';
import {IcoHorHeader, IcoVerHeader} from "./icons";

export type LayoutMode = "horizontal" | "vertical";

export interface LayoutToggleProps {
  /** Текущий режим */
  mode: LayoutMode;
  /** Колбэк при изменении режима */
  onChange: (mode: LayoutMode) => void;
  /** Цветовые токены для стилизации (можно передать частично) */
  theme: Theme;
}

// ─── Компонент ──────────────────────────────────────────

export function LayoutToggle({ mode, onChange, theme: t }: LayoutToggleProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 3,
        padding: 4,
        background: t.bgSurface,
        borderRadius: 9,
        border: `1px solid ${t.border}`,
      }}
    >
      {(["horizontal", "vertical"] as const).map((m) => {
        const isActive = mode === m;
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            title={`${m} navigation`}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "none",
              background: isActive ? t.accent : "transparent",
              color: isActive ? t.accentText : t.textMuted,
              fontSize: 11,
              fontFamily: "system-ui, sans-serif",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
            }}
          >
            {m === "horizontal" ? (
              <IcoHorHeader s={14} />

            ) : (
              <IcoVerHeader s={14} />
            )}
          </button>
        );
      })}
    </div>
  );
}