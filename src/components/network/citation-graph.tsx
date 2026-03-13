'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface GraphNode {
  id: string;
  title: string;
  year?: number;
  citation_count: number;
  authors?: { name: string }[];
  in_project: boolean;
  doi?: string;
  // D3 simulation properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  context_type?: string;
}

interface CitationGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
}

export function CitationGraph({ nodes, edges, onNodeClick }: CitationGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const g = svg.append('g');

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Node size scale based on citation count
    const maxCitations = Math.max(...nodes.map(n => n.citation_count || 1));
    const sizeScale = d3.scaleSqrt().domain([0, maxCitations]).range([4, 20]);

    // Color by year
    const years = nodes.map(n => n.year || 2020).filter(y => y > 0);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([minYear, maxYear]);

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges)
        .id(d => d.id)
        .distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => sizeScale((d as GraphNode).citation_count) + 5));

    // Draw edges
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')
      .attr('stroke', '#3f3f46')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Arrowhead marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#3f3f46');

    // Draw nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', d => sizeScale(d.citation_count))
      .attr('fill', d => d.in_project ? colorScale(d.year || 2020) : '#52525b')
      .attr('stroke', d => d.in_project ? '#3b82f6' : '#71717a')
      .attr('stroke-width', d => d.in_project ? 2 : 1)
      .attr('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('stroke', '#f59e0b').attr('stroke-width', 3);
        const [x, y] = d3.pointer(event, svgRef.current);
        setTooltip({ x, y, node: d });
      })
      .on('mouseout', function (_, d) {
        d3.select(this)
          .attr('stroke', d.in_project ? '#3b82f6' : '#71717a')
          .attr('stroke-width', d.in_project ? 2 : 1);
        setTooltip(null);
      })
      .on('click', (_, d) => onNodeClick?.(d))
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Labels for project papers
    const labels = g.append('g')
      .selectAll('text')
      .data(nodes.filter(n => n.in_project))
      .enter()
      .append('text')
      .text(d => d.title.length > 30 ? d.title.slice(0, 30) + '...' : d.title)
      .attr('font-size', '8px')
      .attr('fill', '#a1a1aa')
      .attr('dx', d => sizeScale(d.citation_count) + 4)
      .attr('dy', 3);

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);

      node
        .attr('cx', d => d.x || 0)
        .attr('cy', d => d.y || 0);

      labels
        .attr('x', d => d.x || 0)
        .attr('y', d => d.y || 0);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, onNodeClick]);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full bg-zinc-900/50 rounded-lg" />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-zinc-800 border border-zinc-700 rounded-md p-2 shadow-lg max-w-xs z-10"
          style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
        >
          <p className="text-xs font-medium text-white leading-snug">{tooltip.node.title}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
            {tooltip.node.year && <span>{tooltip.node.year}</span>}
            <span>被引用: {tooltip.node.citation_count}</span>
            {tooltip.node.in_project && <span className="text-blue-400">プロジェクト内</span>}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-zinc-900/80 border border-zinc-800 rounded p-2 text-[10px] text-zinc-500 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-400" />
          プロジェクト内
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 border border-zinc-500" />
          関連論文
        </div>
        <div className="text-zinc-600">ノードサイズ = 被引用数</div>
      </div>
    </div>
  );
}
