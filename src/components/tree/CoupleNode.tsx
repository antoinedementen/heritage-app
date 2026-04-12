"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

interface CoupleNodeData {
  dissolved?: boolean;
}

export const CoupleNode = memo(function CoupleNode({ data }: NodeProps<CoupleNodeData>) {
  return (
    <div
      className={`
        w-[10px] h-[10px] rounded-full
        ${data.dissolved ? "bg-heritage-sand" : "bg-heritage-gold"}
        border-2 ${data.dissolved ? "border-heritage-brown/30" : "border-heritage-gold"}
      `}
    >
      <Handle type="target" position={Position.Left} id="left" className="!opacity-0 !w-2 !h-2" />
      <Handle type="target" position={Position.Right} id="right" className="!opacity-0 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!opacity-0 !w-2 !h-2" />
    </div>
  );
});
