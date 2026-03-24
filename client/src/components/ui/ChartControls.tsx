/**
 * ChartControls — Shared primitive components for the Three-Zone chart header architecture.
 *
 * Exports:
 *   - IconAction        — Icon-only button with tooltip (Zone 2/3 actions)
 *   - SegmentedControl  — Icon-anchored toggle group (Zone 1 data controls)
 *   - ToggleAction      — Standalone icon+label toggle (Zone 1 standalone toggles)
 *   - ZoneSeparator     — Subtle vertical divider between zones
 *
 * All components follow the neumorphic design language and use Radix Tooltip
 * via the project's `@/components/ui/tooltip` wrapper.
 */

import { type ReactNode } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

// ═══════════════════════════════════════════════════════
// IconAction — Zone 2 (Analysis) & Zone 3 (Utility)
// ═══════════════════════════════════════════════════════

export interface IconActionProps {
  icon: ReactNode;
  tooltip: string;
  isActive?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  isDark: boolean;
  activeColor?: "cyan" | "amber" | "emerald";
}

/**
 * Icon-only action button (28×28px) with hover tooltip.
 * Used for Zone 2 (AI Insights, Trendline) and Zone 3 (Methods, Maximize) actions.
 */
export function IconAction({
  icon,
  tooltip,
  isActive = false,
  onToggle,
  onClick,
  isDark,
  activeColor = "cyan",
}: IconActionProps) {
  const colorMap: Record<string, string> = {
    cyan: "var(--cyan)",
    amber: "var(--amber)",
    emerald: "var(--emerald)",
  };
  const colorVar = colorMap[activeColor] ?? "var(--cyan)";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggle) onToggle();
    else if (onClick) onClick();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className="flex items-center justify-center rounded-lg transition-all cursor-pointer select-none"
          style={{
            width: "28px",
            height: "28px",
            background: isActive ? "var(--neu-bg-pressed)" : "transparent",
            color: isActive ? colorVar : "var(--muted-foreground)",
            boxShadow: isActive
              ? isDark
                ? "inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(60,60,80,0.06)"
                : "inset 1px 1px 3px rgba(0,0,0,0.08), inset -1px -1px 2px rgba(255,255,255,0.4)"
              : "none",
          }}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          {tooltip}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════
// SegmentedControl — Zone 1 (Data Controls)
// ═══════════════════════════════════════════════════════

export interface SegmentedControlOption<T> {
  value: T;
  label?: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (val: T) => void;
  isDark: boolean;
  groupIcon?: ReactNode;
  groupTooltip?: string;
}

/**
 * Icon-anchored segmented control with optional text labels.
 * The leading icon identifies the control group; individual
 * segment labels appear as text inside each pill.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  isDark,
  groupIcon,
  groupTooltip,
}: SegmentedControlProps<T>) {
  const control = (
    <div className="flex items-center gap-1.5">
      {/* Group icon anchor */}
      {groupIcon && (
        <div
          className="flex items-center justify-center"
          style={{
            color: "var(--muted-foreground)",
            opacity: 0.6,
          }}
        >
          {groupIcon}
        </div>
      )}
      {/* Segmented pills */}
      <div
        className="inline-flex rounded-lg p-[2px]"
        style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          boxShadow: isDark
            ? "inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(60,60,80,0.06)"
            : "inset 1px 1px 3px rgba(0,0,0,0.06), inset -1px -1px 2px rgba(255,255,255,0.5)",
        }}
      >
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt.value);
              }}
              className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all flex items-center gap-1 cursor-pointer select-none"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                background: isActive
                  ? isDark
                    ? "rgba(0, 212, 255, 0.12)"
                    : "rgba(8, 145, 178, 0.10)"
                  : "transparent",
                color: isActive
                  ? "var(--cyan)"
                  : "var(--muted-foreground)",
                boxShadow: isActive
                  ? isDark
                    ? "0 1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(0,212,255,0.1)"
                    : "0 1px 3px rgba(0,0,0,0.08), 0 0 8px rgba(8,145,178,0.08)"
                  : "none",
              }}
            >
              {opt.icon}
              {opt.label && <span>{opt.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Wrap in tooltip if groupTooltip provided
  if (groupTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {control}
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            {groupTooltip}
          </span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return control;
}

// ═══════════════════════════════════════════════════════
// ToggleAction — Zone 1 (Standalone Toggles)
// ═══════════════════════════════════════════════════════

export interface ToggleActionProps {
  icon: ReactNode;
  label?: string;
  tooltip: string;
  isActive: boolean;
  onToggle: () => void;
  isDark: boolean;
}

/**
 * Standalone icon+label toggle button with tooltip.
 * Used for Zone 1 toggles like Fill Rate, Color mode, etc.
 */
export function ToggleAction({
  icon,
  label,
  tooltip,
  isActive,
  onToggle,
  isDark,
}: ToggleActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex items-center gap-1.5 transition-all rounded-lg text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none"
          style={{
            padding: "4px 10px",
            fontFamily: "Space Grotesk, sans-serif",
            background: isActive ? "var(--neu-bg-pressed)" : "transparent",
            color: isActive ? "var(--cyan)" : "var(--muted-foreground)",
            boxShadow: isActive
              ? isDark
                ? "inset 1px 1px 3px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(60,60,80,0.06)"
                : "inset 1px 1px 3px rgba(0,0,0,0.08), inset -1px -1px 2px rgba(255,255,255,0.4)"
              : "none",
          }}
        >
          {icon}
          {label && <span>{label}</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          {tooltip}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

// ═══════════════════════════════════════════════════════
// ZoneSeparator — Visual divider between zones
// ═══════════════════════════════════════════════════════

export interface ZoneSeparatorProps {
  isDark: boolean;
}

/**
 * Subtle vertical separator between Zone 2 and Zone 3 in the top-right cluster.
 */
export function ZoneSeparator({ isDark }: ZoneSeparatorProps) {
  return (
    <div
      className="self-stretch mx-0.5"
      style={{
        width: "1px",
        minHeight: "20px",
        background: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
      }}
    />
  );
}
