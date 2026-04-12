"use client";

import { memo } from "react";
import {
  BaseEdge,
  getStraightPath,
  type EdgeProps,
} from "reactflow";

// ── Parent → Child edge (vertical straight line) ──────────────────────────────
export const ParentEdge = memo(function ParentEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeProps) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: "#4A3728", // heritage-dark
        strokeWidth: 2,
      }}
    />
  );
});

// ── Spouse edge (horizontal dashed line) ──────────────────────────────────────
export const SpouseEdge = memo(function SpouseEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps) {
  const dissolved = data?.dissolved as boolean | undefined;
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: dissolved ? "#D4C5A9" : "#B8960C", // sand if dissolved, gold otherwise
        strokeWidth: 2,
        strokeDasharray: "6 4",
        opacity: dissolved ? 0.5 : 1,
      }}
    />
  );
});
