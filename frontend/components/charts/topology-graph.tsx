"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { TopologyNode, TopologyEdge } from "@/lib/api";

const HEALTH_COLOR: Record<string, string> = {
  healthy: "#22D3EE",
  degraded: "#F59E0B",
  critical: "#EF4444",
  unknown: "#6B7280",
};

const NODE_R = 30;

// D3 simulation node extends TopologyNode with position
interface SimNode extends TopologyNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface HoverInfo {
  kind: "node" | "edge";
  svgX: number;
  svgY: number;
  node?: SimNode;
  edge?: TopologyEdge & { srcNode?: SimNode; tgtNode?: SimNode };
}

interface Props {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export function TopologyGraph({ nodes: rawNodes, edges: rawEdges }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, never> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const draggingRef = useRef<{ nodeId: string } | null>(null);
  const [positions, setPositions] = useState<SimNode[]>([]);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [dims, setDims] = useState({ w: 800, h: 500 });

  // Responsive container size
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: Math.max(500, width), h: Math.max(420, height) });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // (Re)initialise simulation when data or dimensions change
  useEffect(() => {
    if (!rawNodes.length) return;

    simRef.current?.stop();

    const nodes: SimNode[] = rawNodes.map(n => ({ ...n }));
    simNodesRef.current = nodes;

    // Build link array referencing nodes by id
    const links = rawEdges.map(e => ({
      source: e.source_id,
      target: e.target_id,
      edgeId: e.id,
    }));

    const sim = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, (typeof links)[0]>(links)
          .id((d: SimNode) => d.id)
          .distance(200)
          .strength(0.6),
      )
      .force("charge", d3.forceManyBody<SimNode>().strength(-600))
      .force("center", d3.forceCenter(dims.w / 2, dims.h / 2))
      .force("collide", d3.forceCollide<SimNode>(NODE_R + 24))
      .alphaDecay(0.04);

    sim.on("tick", () => {
      setPositions([...nodes]);
    });

    simRef.current = sim;
    return () => {
      sim.stop();
    };
  }, [rawNodes, rawEdges, dims]);

  // --- drag helpers (React mouse events, no d3.drag) ---
  const svgPoint = (e: React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * dims.w,
      y: ((e.clientY - rect.top) / rect.height) * dims.h,
    };
  };

  const onNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = { nodeId: id };
    const node = simNodesRef.current.find(n => n.id === id);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
    simRef.current?.alphaTarget(0.3).restart();
  };

  const onSvgMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const { x, y } = svgPoint(e);
    const node = simNodesRef.current.find(n => n.id === draggingRef.current!.nodeId);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  };

  const onSvgMouseUp = () => {
    if (!draggingRef.current) return;
    const node = simNodesRef.current.find(n => n.id === draggingRef.current!.nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
    simRef.current?.alphaTarget(0);
    draggingRef.current = null;
  };

  // Build a lookup of current positions for edge rendering
  const posMap = new Map(positions.map(n => [n.id, n]));

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[420px]">
      {/* Hover tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-20 rounded border border-border bg-card px-3 py-2 text-[11px] shadow-lg"
          style={{
            left: (hover.svgX / dims.w) * 100 + "%",
            top: (hover.svgY / dims.h) * 100 + "%",
            transform: "translate(12px, -50%)",
          }}
        >
          {hover.kind === "node" && hover.node && (
            <>
              <p className="font-semibold text-foreground">{hover.node.name}</p>
              <p className="mt-0.5" style={{ color: HEALTH_COLOR[hover.node.health_status] }}>
                {hover.node.health_status}
              </p>
              {hover.node.error_rate != null && (
                <p className="text-muted-foreground">
                  Error rate: {(hover.node.error_rate * 100).toFixed(2)}%
                </p>
              )}
              {hover.node.p99_ms != null && (
                <p className="text-muted-foreground">
                  P99: {hover.node.p99_ms.toFixed(0)} ms
                </p>
              )}
            </>
          )}
          {hover.kind === "edge" && hover.edge && (
            <>
              <p className="font-semibold text-foreground">
                {hover.edge.srcNode?.name} → {hover.edge.tgtNode?.name}
              </p>
              <p className="text-muted-foreground mt-0.5">
                Calls: {hover.edge.call_count.toLocaleString()}
              </p>
              {hover.edge.error_rate != null && (
                <p className="text-muted-foreground">
                  Error: {(hover.edge.error_rate * 100).toFixed(2)}%
                </p>
              )}
              {hover.edge.avg_latency_ms != null && (
                <p className="text-muted-foreground">
                  Avg latency: {hover.edge.avg_latency_ms.toFixed(0)} ms
                </p>
              )}
            </>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        className="min-h-[420px] cursor-default"
        onMouseMove={onSvgMouseMove}
        onMouseUp={onSvgMouseUp}
        onMouseLeave={onSvgMouseUp}
      >
        <defs>
          {/* Arrow markers per health status */}
          {Object.entries(HEALTH_COLOR).map(([status, color]) => (
            <marker
              key={status}
              id={`arrow-${status}`}
              viewBox="0 -4 8 8"
              refX="7"
              refY="0"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0,-4L8,0L0,4Z" fill={color} opacity={0.8} />
            </marker>
          ))}
          {/* Subtle glow filter for hovered nodes */}
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {rawEdges.map(edge => {
          const src = posMap.get(edge.source_id);
          const tgt = posMap.get(edge.target_id);
          if (!src?.x || !src?.y || !tgt?.x || !tgt?.y) return null;

          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / dist;
          const uy = dy / dist;

          // Shorten line to node circumference
          const x1 = src.x + ux * (NODE_R + 2);
          const y1 = src.y + uy * (NODE_R + 2);
          const x2 = tgt.x - ux * (NODE_R + 10);
          const y2 = tgt.y - uy * (NODE_R + 10);

          const tgtHealth = tgt.health_status ?? "unknown";
          const strokeColor = HEALTH_COLOR[tgtHealth] ?? HEALTH_COLOR.unknown;
          const strokeW = Math.max(1.5, Math.min(5, edge.call_count / 60));
          const isHovered =
            hover?.kind === "edge" && hover.edge?.id === edge.id;

          return (
            <g key={edge.id}>
              {/* Invisible thick hit area */}
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="transparent"
                strokeWidth={18}
                className="cursor-pointer"
                onMouseEnter={e => {
                  const pt = svgPoint(e);
                  setHover({
                    kind: "edge",
                    svgX: pt.x,
                    svgY: pt.y,
                    edge: { ...edge, srcNode: src, tgtNode: tgt },
                  });
                }}
                onMouseLeave={() => setHover(null)}
              />
              {/* Visible line */}
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={strokeColor}
                strokeWidth={isHovered ? strokeW + 1.5 : strokeW}
                strokeOpacity={isHovered ? 0.9 : 0.45}
                markerEnd={`url(#arrow-${tgtHealth})`}
                pointerEvents="none"
              />
            </g>
          );
        })}

        {/* Nodes */}
        {positions.map(node => {
          if (!node.x || !node.y) return null;
          const color = HEALTH_COLOR[node.health_status] ?? HEALTH_COLOR.unknown;
          const isHovered = hover?.kind === "node" && hover.node?.id === node.id;
          const shortName = node.name
            .replace("-service", "")
            .replace("-gateway", " gw");

          return (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={e => onNodeMouseDown(e, node.id)}
              onMouseEnter={e => {
                const pt = svgPoint(e);
                setHover({ kind: "node", svgX: pt.x, svgY: pt.y, node });
              }}
              onMouseLeave={() => setHover(null)}
              filter={isHovered ? "url(#glow)" : undefined}
            >
              {/* Outer ring */}
              <circle
                r={NODE_R + 4}
                fill="none"
                stroke={color}
                strokeWidth={1}
                strokeOpacity={0.25}
              />
              {/* Main circle */}
              <circle
                r={NODE_R}
                fill={color + "20"}
                stroke={color}
                strokeWidth={2}
              />
              {/* Health dot */}
              <circle r={5} cx={NODE_R - 6} cy={-(NODE_R - 6)} fill={color} />
              {/* Service label */}
              <text
                textAnchor="middle"
                dy="0.35em"
                fontSize={10}
                fontWeight={500}
                fill={color}
                className="select-none"
              >
                {shortName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
