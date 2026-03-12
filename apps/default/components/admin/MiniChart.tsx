import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
import { colors } from "@/lib/theme";

/* ─── Smooth Line Chart ─────────────────────────────────── */
interface LineChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  showDots?: boolean;
  showArea?: boolean;
}

export function MiniLineChart({
  data,
  labels,
  height = 120,
  color = colors.black,
  showDots = true,
  showArea = true,
}: LineChartProps) {
  if (data.length < 2) return null;

  const width = 300;
  const pad = { top: 16, bottom: labels ? 24 : 8, left: 8, right: 8 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const max = Math.max(...data, 1);
  const min = 0;
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: pad.left + (i / (data.length - 1)) * chartW,
    y: pad.top + chartH - ((v - min) / range) * chartH,
  }));

  // smooth bezier path
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
    linePath += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`;
  }

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${pad.top + chartH} L ${points[0].x} ${pad.top + chartH} Z`;

  return (
    <View style={lineStyles.container}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.12" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {showArea && <Path d={areaPath} fill="url(#areaGrad)" />}
        <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {showDots &&
          points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors.white} stroke={color} strokeWidth={2} />
          ))}
      </Svg>
      {labels && (
        <View style={lineStyles.labels}>
          {labels.map((l, i) => (
            <Text key={i} style={lineStyles.label}>
              {l}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const lineStyles = StyleSheet.create({
  container: { width: "100%" },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginTop: -20,
  },
  label: { fontSize: 10, color: colors.gray400, fontWeight: "500" },
});

/* ─── Bar Chart ─────────────────────────────────────────── */
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  barColor?: string;
}

export function MiniBarChart({ data, height = 100, barColor = colors.black }: BarChartProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={barStyles.container}>
      <View style={[barStyles.barsRow, { height }]}>
        {data.map((d, i) => (
          <View key={i} style={barStyles.barCol}>
            <View style={barStyles.barTrack}>
              <View
                style={[
                  barStyles.barFill,
                  {
                    height: `${(d.value / max) * 100}%`,
                    backgroundColor: d.color ?? barColor,
                  },
                ]}
              />
            </View>
            <Text style={barStyles.barLabel}>{d.label}</Text>
            <Text style={barStyles.barValue}>{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { width: "100%" },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingBottom: 36,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrack: {
    width: "100%",
    flex: 1,
    justifyContent: "flex-end",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    borderCurve: "continuous",
  },
  barFill: {
    width: "100%",
    borderRadius: 6,
    borderCurve: "continuous",
    minHeight: 3,
  },
  barLabel: {
    fontSize: 10,
    color: colors.gray400,
    fontWeight: "500",
    marginTop: 6,
  },
  barValue: {
    fontSize: 11,
    color: colors.gray600,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
});

/* ─── Revenue Row (for event list) ──────────────────────── */
interface RevenueRowProps {
  label: string;
  amount: string;
  subtitle?: string;
  accent?: boolean;
}

export function RevenueRow({ label, amount, subtitle, accent }: RevenueRowProps) {
  return (
    <View style={revStyles.row}>
      <View style={{ flex: 1 }}>
        <Text style={revStyles.label}>{label}</Text>
        {subtitle && <Text style={revStyles.subtitle}>{subtitle}</Text>}
      </View>
      <Text style={[revStyles.amount, accent && revStyles.amountAccent]}>{amount}</Text>
    </View>
  );
}

const revStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  label: { fontSize: 14, fontWeight: "500", color: colors.black },
  subtitle: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.black,
    fontVariant: ["tabular-nums"],
  },
  amountAccent: { color: colors.success },
});
