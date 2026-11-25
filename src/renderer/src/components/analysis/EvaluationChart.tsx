import { useCallback, useMemo } from "react";
import { Area, AreaChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts";
import { type ReviewedMoveAnalysis } from "@shared/types/chess";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { MOVE_CLASSIFICATION_META } from "@/constants/moveClassificationMeta";
import {
  type EvaluationChartPoint,
  buildEvaluationChartPoints,
  isHighlightedMoveClassification,
} from "@/utils/moveListUtils";

interface EvaluationChartProps {
  reviewedMoves: ReviewedMoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

interface CategoricalChartClickPayload {
  activePayload?: Array<{ payload?: { ply?: number } }>;
  activeTooltipIndex?: number;
}

const EVALUATION_CHART_CONFIG = {
  whiteWinPercent: {
    label: "Vantagem Brancas",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const DEFAULT_ACTIVE_CURSOR_COLOR = "#38bdf8";

const CHART_MARGIN = { top: 0, right: 0, left: 0, bottom: 0 } as const;

export function EvaluationChart({ reviewedMoves, currentPly, onSelectPly }: EvaluationChartProps) {
  const chartPoints = useMemo(() => buildEvaluationChartPoints(reviewedMoves), [reviewedMoves]);

  const selectedPoint = useMemo(
    () => chartPoints.find((point) => point.ply === currentPly) ?? chartPoints[0],
    [chartPoints, currentPly]
  );

  const selectedPointColor = useMemo(() => resolveSelectedPointColor(selectedPoint), [selectedPoint]);

  const handleChartClick = useCallback(
    (chartState: unknown, event?: React.MouseEvent) => {
      const targetPly = resolveClickedTargetPly(chartState, event, reviewedMoves.length);
      const isValidTargetPly = typeof targetPly === "number";

      if (isValidTargetPly) {
        onSelectPly(targetPly);
      }
    },
    [onSelectPly, reviewedMoves.length]
  );

  if (reviewedMoves.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-1">
      <ChartContainer
        config={EVALUATION_CHART_CONFIG}
        className="h-20 w-full aspect-auto cursor-pointer overflow-hidden rounded-md border border-border bg-secondary shadow-sm ring-1 ring-border/50 select-none"
      >
        <AreaChart data={chartPoints} margin={CHART_MARGIN} onClick={handleChartClick}>
          <XAxis dataKey="ply" hide />
          <YAxis domain={[0, 100]} hide />

          <Area
            type="monotone"
            dataKey="whiteWinPercent"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fill="hsl(var(--primary))"
            fillOpacity={1}
            isAnimationActive={false}
            dot={(dotProps) => (
              <EvaluationChartMarkerDot
                key={dotProps.key ?? `marker-${dotProps.index}`}
                cx={dotProps.cx}
                cy={dotProps.cy}
                payload={dotProps.payload as EvaluationChartPoint | undefined}
              />
            )}
            activeDot={false}
          />

          <ReferenceLine y={50} isFront={true} shape={<EvaluationBaselineShape />} />

          <ReferenceLine
            x={currentPly}
            isFront={true}
            stroke={selectedPointColor}
            strokeWidth={2}
            shape={<ActiveMoveVerticalCursor stroke={selectedPointColor} strokeWidth={2} />}
          />

          {selectedPoint && (
            <ReferenceDot
              x={currentPly}
              y={selectedPoint.whiteWinPercent}
              isFront={true}
              r={4.5}
              fill={selectedPointColor}
              stroke="none"
              className="pointer-events-none"
            />
          )}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

interface EvaluationBaselineShapeProps {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

function EvaluationBaselineShape({ x1, y1, x2, y2 }: EvaluationBaselineShapeProps) {
  const hasValidCoordinates =
    typeof x1 === "number" && typeof y1 === "number" && typeof x2 === "number" && typeof y2 === "number";

  if (!hasValidCoordinates) {
    return null;
  }

  return (
    <g className="pointer-events-none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0, 0, 0, 0.75)" strokeWidth={1.8} strokeDasharray="4 4" />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(255, 255, 255, 0.85)"
        strokeWidth={1.8}
        strokeDasharray="4 4"
        strokeDashoffset={4}
      />
    </g>
  );
}

interface ActiveMoveVerticalCursorProps {
  x1?: number;
  stroke?: string;
  strokeWidth?: number;
}

function ActiveMoveVerticalCursor({ x1, stroke, strokeWidth }: ActiveMoveVerticalCursorProps) {
  const hasValidXCoordinate = typeof x1 === "number";

  if (!hasValidXCoordinate) {
    return null;
  }

  return (
    <line
      x1={x1}
      y1={0}
      x2={x1}
      y2="100%"
      stroke={stroke}
      strokeWidth={strokeWidth ?? 2}
      className="pointer-events-none"
    />
  );
}

interface EvaluationChartMarkerDotProps {
  cx?: number;
  cy?: number;
  payload?: EvaluationChartPoint;
}

function EvaluationChartMarkerDot({ cx, cy, payload }: EvaluationChartMarkerDotProps) {
  const hasValidCoordinates = typeof cx === "number" && typeof cy === "number";
  if (!hasValidCoordinates || !payload) {
    return null;
  }

  const isEligibleForMarker = isHighlightedMoveClassification(payload.classification);
  if (!isEligibleForMarker || !payload.classification) {
    return null;
  }

  const meta = MOVE_CLASSIFICATION_META[payload.classification];
  return <circle cx={cx} cy={cy} r={4} fill={meta.hexColor} stroke="none" className="pointer-events-none" />;
}

function resolveSelectedPointColor(selectedPoint: EvaluationChartPoint | undefined): string {
  const hasClassification = Boolean(selectedPoint?.classification);
  if (hasClassification && selectedPoint?.classification) {
    return MOVE_CLASSIFICATION_META[selectedPoint.classification].hexColor;
  }
  return DEFAULT_ACTIVE_CURSOR_COLOR;
}

function resolveClickedTargetPly(
  chartState: unknown,
  event: React.MouseEvent | undefined,
  totalMoves: number
): number | null {
  const typedState = chartState as CategoricalChartClickPayload | null;
  const activePayloadPly = typedState?.activePayload?.[0]?.payload?.ply;
  const activeTooltipIndex = typedState?.activeTooltipIndex;

  if (typeof activePayloadPly === "number") {
    return activePayloadPly;
  }

  if (typeof activeTooltipIndex === "number") {
    return activeTooltipIndex;
  }

  if (event?.currentTarget) {
    return calculatePlyFromBoundingBox(event.currentTarget as Element, event.clientX, totalMoves);
  }

  return null;
}

function calculatePlyFromBoundingBox(element: Element, clientX: number, totalMoves: number): number {
  const rect = element.getBoundingClientRect();
  const horizontalRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return Math.round(horizontalRatio * totalMoves);
}
