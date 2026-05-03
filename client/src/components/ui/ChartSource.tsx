/**
 * ChartSource — editorial data-source attribution footer
 *
 * Renders a right-aligned, monospaced "Source: …" line at the bottom
 * of a chart card, matching the style used by The Athletic, FiveThirtyEight,
 * and NYT Graphics.
 */

interface ChartSourceProps {
  source: string;
  className?: string;
}

export function ChartSource({ source, className = "" }: ChartSourceProps) {
  return (
    <p
      className={className}
      style={{
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "9px",
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: "var(--muted-foreground)",
        opacity: 0.5,
        textAlign: "right",
        marginTop: "10px",
        paddingRight: "2px",
        paddingBottom: "2px",
        lineHeight: 1.4,
        userSelect: "none",
      }}
    >
      Source: {source}
    </p>
  );
}

export default ChartSource;
