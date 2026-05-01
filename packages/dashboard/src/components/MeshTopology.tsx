import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { AgentOnlineStatus, TopologyEdge } from '../hooks/useAXLTopology.js'

interface Node extends d3.SimulationNodeDatum {
  id: string
  online: boolean
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node
  target: string | Node
}

interface Props {
  agents: AgentOnlineStatus[]
  edges: TopologyEdge[]
}

export function MeshTopology({ agents, edges }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || agents.length === 0) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 400
    const height = svgRef.current.clientHeight || 300

    const nodes: Node[] = agents.map((a) => ({ id: a.name, online: a.online }))
    const links: Link[] = edges.map((e) => ({ source: e.source, target: e.target }))

    const sim = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id((d) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40))

    const g = svg.append('g')

    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,2')

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')

    node.append('circle')
      .attr('r', 20)
      .attr('fill', (d) => d.online ? '#064e3b' : '#111827')
      .attr('stroke', (d) => d.online ? '#10b981' : '#374151')
      .attr('stroke-width', 2)

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('fill', (d) => d.online ? '#d1fae5' : '#6b7280')
      .attr('font-family', 'monospace')
      .text((d) => d.id.slice(0, 3).toUpperCase())

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '2.5em')
      .attr('font-size', '9px')
      .attr('fill', '#6b7280')
      .attr('font-family', 'monospace')
      .text((d) => d.id)

    // Online indicator pulse
    node.filter((d) => d.online)
      .append('circle')
      .attr('r', 20)
      .attr('fill', 'none')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3)

    sim.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as Node).x ?? 0)
        .attr('y1', (d) => (d.source as Node).y ?? 0)
        .attr('x2', (d) => (d.target as Node).x ?? 0)
        .attr('y2', (d) => (d.target as Node).y ?? 0)
      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => { sim.stop() }
  }, [agents, edges])

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ minHeight: 280 }}
    />
  )
}
