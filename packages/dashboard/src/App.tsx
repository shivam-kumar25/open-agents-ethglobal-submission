import { useState, useEffect, type CSSProperties } from 'react'
import { useAXLTopology, type AgentOnlineStatus } from './hooks/useAXLTopology.js'
import { useENSRecords, type AgentENSData } from './hooks/useENSRecords.js'
import { TaskSubmit } from './components/TaskSubmit.js'
import { AGENTS, EVOLUTION_THRESHOLD, ENS_APP } from './config.js'

// ── SVG Avatar Components ──────────────────────────────────────────────────
type AvatarFC = (props: { size?: number }) => JSX.Element

function PlannerAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Uniform body */}
      <path d="M5 80 C5 60 18 52 40 50 C62 52 75 60 75 80Z" fill="#1B263B"/>
      {/* Gold epaulettes */}
      <rect x="4" y="50" width="14" height="6" rx="2" fill="#FFD60A"/>
      <rect x="62" y="50" width="14" height="6" rx="2" fill="#FFD60A"/>
      {/* Medals */}
      <circle cx="27" cy="62" r="3.5" fill="#FFD60A" stroke="#000" strokeWidth="0.8"/>
      <circle cx="40" cy="65" r="3.5" fill="#E63946" stroke="#000" strokeWidth="0.8"/>
      <circle cx="27" cy="71" r="3.5" fill="#2DC653" stroke="#000" strokeWidth="0.8"/>
      {/* Neck */}
      <rect x="34" y="42" width="12" height="10" fill="#F4A261"/>
      {/* Head */}
      <ellipse cx="40" cy="30" rx="18" ry="19" fill="#F4A261"/>
      {/* Peaked cap */}
      <path d="M22 22 Q40 10 58 22 L58 18 Q40 6 22 18Z" fill="#1B263B"/>
      <rect x="20" y="18" width="40" height="7" rx="2" fill="#1B263B"/>
      <ellipse cx="40" cy="25" rx="22" ry="3" fill="#0D1B2A"/>
      {/* Cap badge */}
      <polygon points="40,11 43.5,18 36.5,18" fill="#FFD60A"/>
      {/* Eyes */}
      <ellipse cx="32" cy="30" rx="3" ry="3.5" fill="white"/>
      <ellipse cx="48" cy="30" rx="3" ry="3.5" fill="white"/>
      <circle cx="32.5" cy="30.5" r="1.8" fill="#1a1a1a"/>
      <circle cx="48.5" cy="30.5" r="1.8" fill="#1a1a1a"/>
      {/* Stern eyebrows */}
      <path d="M28 25.5 L35 27" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
      <path d="M45 27 L52 25.5" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
      {/* Firm mouth */}
      <path d="M33 39 L47 39" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function ResearcherAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Lab coat body */}
      <path d="M5 80 C5 60 18 52 40 50 C62 52 75 60 75 80Z" fill="white" stroke="#DDD" strokeWidth="1"/>
      {/* Coat lapels */}
      <path d="M30 52 L26 70 L40 66 L54 70 L50 52Z" fill="white" stroke="#DDD" strokeWidth="1"/>
      {/* Pocket */}
      <rect x="47" y="62" width="14" height="12" rx="1.5" fill="none" stroke="#CCC" strokeWidth="1.5"/>
      {/* Magnifying glass */}
      <circle cx="68" cy="56" r="9" fill="none" stroke="#00B4D8" strokeWidth="2.5"/>
      <line x1="74" y1="62.5" x2="78" y2="67" stroke="#00B4D8" strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="68" cy="56" r="5" fill="rgba(0,180,216,0.12)"/>
      {/* Neck */}
      <rect x="34" y="43" width="12" height="9" fill="#FDDCB5"/>
      {/* Head */}
      <ellipse cx="40" cy="31" rx="18" ry="19" fill="#FDDCB5"/>
      {/* Wild spiky hair */}
      <path d="M22 25 C20 16 16 7 22 5 C20 14 25 17 28 16 C26 8 29 2 35 3 C32 11 34 16 38 15 C38 8 41 2 47 4 C44 12 46 17 50 17 C52 11 56 7 59 12 C55 15 54 20 56 25" fill="#3D2B1F"/>
      {/* Round glasses */}
      <circle cx="31" cy="31" r="6.5" fill="rgba(255,255,255,0.3)" stroke="#333" strokeWidth="2"/>
      <circle cx="49" cy="31" r="6.5" fill="rgba(255,255,255,0.3)" stroke="#333" strokeWidth="2"/>
      <line x1="37.5" y1="31" x2="42.5" y2="31" stroke="#333" strokeWidth="2"/>
      <line x1="24.5" y1="31" x2="22" y2="28" stroke="#333" strokeWidth="2"/>
      <line x1="55.5" y1="31" x2="58" y2="28" stroke="#333" strokeWidth="2"/>
      {/* Eyes */}
      <circle cx="31" cy="31" r="2.2" fill="#3D2B1F"/>
      <circle cx="49" cy="31" r="2.2" fill="#3D2B1F"/>
      {/* Smile */}
      <path d="M34 40 Q40 44 46 40" stroke="#555" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function ExecutorAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Athletic bodysuit */}
      <path d="M5 80 C5 58 18 50 40 48 C62 50 75 58 75 80Z" fill="#111"/>
      {/* Shoulder pads */}
      <ellipse cx="11" cy="52" rx="10" ry="6" fill="#F72585"/>
      <ellipse cx="69" cy="52" rx="10" ry="6" fill="#F72585"/>
      {/* Lightning bolt on chest */}
      <polygon points="46,52 36,66 42,66 35,80 54,62 45,62" fill="#F72585"/>
      {/* Neck */}
      <rect x="34" y="42" width="12" height="8" fill="#F4A261"/>
      {/* Head */}
      <ellipse cx="40" cy="30" rx="18" ry="19" fill="#F4A261"/>
      {/* Dark sleek hair */}
      <path d="M22 24 Q40 12 58 24 Q55 16 40 13 Q25 13 22 24Z" fill="#111"/>
      {/* Futuristic visor */}
      <path d="M22 28 Q40 20 58 28 L58 36 Q40 40 22 36Z" fill="#F72585" opacity="0.95"/>
      <path d="M22 28 Q40 20 58 28 L58 31 Q40 25 22 31Z" fill="white" opacity="0.2"/>
      {/* Glowing eyes through visor */}
      <ellipse cx="31" cy="31.5" rx="5" ry="3.5" fill="white" opacity="0.9"/>
      <ellipse cx="49" cy="31.5" rx="5" ry="3.5" fill="white" opacity="0.9"/>
      <circle cx="31.5" cy="31.5" r="2.2" fill="#FF00AA"/>
      <circle cx="49.5" cy="31.5" r="2.2" fill="#FF00AA"/>
      {/* Chin */}
      <path d="M33 41 Q40 44.5 47 41" stroke="#d4a" strokeWidth="1.5" fill="none"/>
    </svg>
  )
}

function EvaluatorAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Judicial robe */}
      <path d="M5 80 C5 58 15 50 40 48 C65 50 75 58 75 80Z" fill="#2D1B4E"/>
      {/* White collar */}
      <path d="M30 50 L25 72 L40 67 L55 72 L50 50Z" fill="white"/>
      {/* Gavel */}
      <rect x="57" y="52" width="20" height="9" rx="3" fill="#8B4513" transform="rotate(-30 57 52)"/>
      <rect x="63" y="58" width="4" height="18" rx="2" fill="#6B3410" transform="rotate(-30 63 58)"/>
      {/* Scales */}
      <line x1="12" y1="52" x2="12" y2="65" stroke="#FFD60A" strokeWidth="2"/>
      <line x1="5" y1="52" x2="19" y2="52" stroke="#FFD60A" strokeWidth="2"/>
      <path d="M5 52 L5 59 Q8.5 63 12 59 Q15.5 63 19 59 L19 52" stroke="#FFD60A" strokeWidth="1.5" fill="none"/>
      {/* Neck */}
      <rect x="34" y="40" width="12" height="10" fill="#FDDCB5"/>
      {/* Head */}
      <ellipse cx="40" cy="28" rx="17" ry="18" fill="#FDDCB5"/>
      {/* Curly white wig */}
      <path d="M23 22 Q21 9 27 7 Q25 16 30 17 Q27 7 36 7 Q33 16 38 17 Q36 7 44 8 Q41 17 46 17 Q43 8 52 11 Q49 19 55 22" fill="#F0F0F0"/>
      <path d="M23 22 Q17 26 18 38 Q21 37 22 35 Q23 29 25 26" fill="#F0F0F0"/>
      <path d="M57 22 Q63 26 62 38 Q59 37 58 35 Q57 29 55 26" fill="#F0F0F0"/>
      {/* Eyes */}
      <ellipse cx="33" cy="27" rx="3.2" ry="3" fill="white"/>
      <ellipse cx="47" cy="27" rx="3.2" ry="3" fill="white"/>
      <circle cx="33.5" cy="27" r="1.8" fill="#2D1B4E"/>
      <circle cx="47.5" cy="27" r="1.8" fill="#2D1B4E"/>
      {/* Scrutinizing eyebrows */}
      <path d="M30 23 Q33 21 36 23" stroke="#888" strokeWidth="1.5" fill="none"/>
      <path d="M44 23 Q47 21 50 23" stroke="#888" strokeWidth="1.5" fill="none"/>
      {/* Serious mouth */}
      <path d="M35 36 Q40 37 45 36" stroke="#777" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function EvolutionAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Futuristic bodysuit */}
      <path d="M8 80 C8 57 19 49 40 47 C61 49 72 57 72 80Z" fill="#0D4A3C"/>
      {/* Circuit lines on body */}
      <line x1="24" y1="55" x2="33" y2="55" stroke="#06D6A0" strokeWidth="1.5"/>
      <line x1="33" y1="55" x2="33" y2="70" stroke="#06D6A0" strokeWidth="1.5"/>
      <circle cx="33" cy="70" r="2.5" fill="#06D6A0"/>
      <line x1="47" y1="55" x2="56" y2="55" stroke="#06D6A0" strokeWidth="1.5"/>
      <line x1="47" y1="55" x2="47" y2="73" stroke="#06D6A0" strokeWidth="1.5"/>
      <circle cx="47" cy="73" r="2.5" fill="#06D6A0"/>
      {/* DNA helix */}
      <path d="M37 52 Q42 57 37 63 Q42 69 37 75" stroke="#06D6A0" strokeWidth="2" fill="none"/>
      <path d="M43 52 Q38 57 43 63 Q38 69 43 75" stroke="#06D6A0" strokeWidth="2" fill="none"/>
      <line x1="37" y1="57" x2="43" y2="57" stroke="#06D6A0" strokeWidth="1.5"/>
      <line x1="37" y1="63" x2="43" y2="63" stroke="#06D6A0" strokeWidth="1.5"/>
      <line x1="37" y1="69" x2="43" y2="69" stroke="#06D6A0" strokeWidth="1.5"/>
      {/* Neck */}
      <rect x="34" y="38" width="12" height="11" fill="#C5F5EC"/>
      {/* Large dome head */}
      <ellipse cx="40" cy="24" rx="23" ry="25" fill="#C5F5EC"/>
      {/* Dome highlight */}
      <ellipse cx="32" cy="13" rx="9" ry="5.5" fill="rgba(255,255,255,0.3)" transform="rotate(-20 32 13)"/>
      {/* Main antenna */}
      <line x1="40" y1="0" x2="40" y2="9" stroke="#06D6A0" strokeWidth="2.5"/>
      <circle cx="40" cy="0" r="4" fill="#06D6A0"/>
      {/* Side antennae */}
      <line x1="20" y1="10" x2="14" y2="3" stroke="#06D6A0" strokeWidth="1.5"/>
      <circle cx="13" cy="2.5" r="2.5" fill="#06D6A0"/>
      <line x1="60" y1="10" x2="66" y2="3" stroke="#06D6A0" strokeWidth="1.5"/>
      <circle cx="67" cy="2.5" r="2.5" fill="#06D6A0"/>
      {/* Large glowing eyes */}
      <ellipse cx="30" cy="26" rx="7" ry="6" fill="#06D6A0" opacity="0.9"/>
      <ellipse cx="50" cy="26" rx="7" ry="6" fill="#06D6A0" opacity="0.9"/>
      <ellipse cx="30" cy="26" rx="4.5" ry="4" fill="white" opacity="0.95"/>
      <ellipse cx="50" cy="26" rx="4.5" ry="4" fill="white" opacity="0.95"/>
      <circle cx="31" cy="26.5" r="2.2" fill="#003D30"/>
      <circle cx="51" cy="26.5" r="2.2" fill="#003D30"/>
      {/* Slot mouth */}
      <path d="M33 37 L47 37" stroke="#06D6A0" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Temple circuit nodes */}
      <circle cx="17" cy="26" r="2" fill="#06D6A0" opacity="0.7"/>
      <circle cx="63" cy="26" r="2" fill="#06D6A0" opacity="0.7"/>
    </svg>
  )
}

// ── Per-agent visual identity ──────────────────────────────────────────────
const AGENT_META: Record<string, { color: string; Avatar: AvatarFC; role: string }> = {
  planner:    { color: '#FFD60A', Avatar: PlannerAvatar,    role: 'THE STRATEGIST' },
  researcher: { color: '#00B4D8', Avatar: ResearcherAvatar, role: 'THE ANALYST'    },
  executor:   { color: '#F72585', Avatar: ExecutorAvatar,   role: 'THE DOER'       },
  evaluator:  { color: '#7B2FBE', Avatar: EvaluatorAvatar,  role: 'THE JUDGE'      },
  evolution:  { color: '#06D6A0', Avatar: EvolutionAvatar,  role: 'THE EVOLVER'    },
}

// ── 3-D Collaboration Playground ──────────────────────────────────────────
const NODES: Record<string, { x: number; y: number; z: number; name: string }> = {
  planner:    { x: 0.50, y: 0.50, z: 80,  name: 'planner'    },
  researcher: { x: 0.22, y: 0.28, z: 30,  name: 'researcher' },
  executor:   { x: 0.78, y: 0.28, z: 30,  name: 'executor'   },
  evaluator:  { x: 0.22, y: 0.78, z: -20, name: 'evaluator'  },
  evolution:  { x: 0.78, y: 0.78, z: -20, name: 'evolution'  },
}

function Playground({ agentsTopology }: { agentsTopology: AgentOnlineStatus[] }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let raf: number
    const loop = () => { setTick((t) => t + 1); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const flash = (Math.sin(tick / 30) + 1) / 2
  const onlineMap = Object.fromEntries(agentsTopology.map((a) => [a.name, a.online]))

  const PA = NODES['planner']!
  const PB = NODES['researcher']!
  const t = (Math.sin(tick / 25) + 1) / 2

  return (
    <div style={pg.wrap}>
      <div style={pg.header}>
        <span style={pg.eyebrow}>SCENE · 03</span>
        <span style={pg.title}>COLLAB MESH</span>
        <span style={pg.note}>5 nodes · live</span>
      </div>

      <div style={pg.scene}>
        <div style={{ ...pg.world, transform: 'rotateX(58deg)' }}>
          <div style={pg.floor} />

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={pg.linkSvg}>
            <defs>
              <linearGradient id="flashG" x1="0" x2="1">
                <stop offset="0%" stopColor="#FFD60A" />
                <stop offset="100%" stopColor="#00B4D8" />
              </linearGradient>
            </defs>
            {/* Payment glow line: planner → researcher only */}
            <line x1={PA.x*100} y1={PA.y*100} x2={PB.x*100} y2={PB.y*100}
              stroke="url(#flashG)" strokeWidth={1.2 + flash * 1.2} opacity={0.5 + flash * 0.5} />
            {/* Animated payment dot */}
            <circle
              cx={PA.x*100 + (PB.x*100 - PA.x*100) * t}
              cy={PA.y*100 + (PB.y*100 - PA.y*100) * t}
              r={1.5} fill="#FFD60A" stroke="#000" strokeWidth={0.4} />
          </svg>

          {Object.entries(NODES).map(([key, n]) => {
            const meta = AGENT_META[key]!
            const online = onlineMap[key] ?? true
            const pulse = (Math.sin((tick + key.length * 13) / 18) + 1) / 2
            const AvatarComp = meta.Avatar
            return (
              <div key={key} style={{ ...pg.nodeWrap, left: `${n.x*100}%`, top: `${n.y*100}%`,
                transform: `translate(-50%,-50%) translateZ(${n.z}px)` }}>
                <div style={{ transform: 'rotateX(-58deg)' }}>
                  <div style={{ ...pg.orb, background: meta.color,
                    boxShadow: online ? `0 0 ${20+pulse*25}px ${meta.color}, 4px 4px 0 #000` : '4px 4px 0 #000',
                    opacity: online ? 1 : 0.3 }}>
                    <AvatarComp size={48} />
                  </div>
                  <div style={pg.orbLabel}>{key.toUpperCase()}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={pg.legend}>
          <span style={pg.legendDot} />
          <span>ACTIVE PAYMENT · PLANNER → RESEARCHER</span>
        </div>
      </div>
    </div>
  )
}

const pg: Record<string, CSSProperties> = {
  wrap: { border: '3px solid #000', boxShadow: '6px 6px 0 #000', background: '#fff', padding: 18,
    display: 'flex', flexDirection: 'column', gap: 12, height: '100%' },
  header: { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: 2, color: '#666' },
  title: { fontFamily: "'Archivo Black', sans-serif", fontSize: 36, letterSpacing: -1, lineHeight: '0.9' },
  note: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#888', marginLeft: 'auto' },
  scene: { position: 'relative', flex: 1, minHeight: 380, perspective: '1200px', perspectiveOrigin: '50% 40%',
    background: 'repeating-linear-gradient(45deg,#FAFAF8 0 12px,#F2F0E8 12px 24px)',
    border: '3px solid #000', overflow: 'hidden' },
  world: { position: 'absolute', inset: 0, transformStyle: 'preserve-3d' },
  floor: { position: 'absolute', inset: 0,
    background: "linear-gradient(0deg,rgba(255,255,255,0.6),rgba(255,255,255,0)),repeating-linear-gradient(0deg,transparent 0 24px,rgba(0,0,0,0.06) 24px 25px),repeating-linear-gradient(90deg,transparent 0 24px,rgba(0,0,0,0.06) 24px 25px)" },
  linkSvg: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  nodeWrap: { position: 'absolute', transformStyle: 'preserve-3d' },
  orb: { width: 80, height: 80, borderRadius: '50%', border: '3px solid #000',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'box-shadow 200ms',
    overflow: 'hidden' },
  orbLabel: { marginTop: 6, textAlign: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: 10,
    letterSpacing: 1.5, background: '#000', color: '#fff', padding: '2px 6px', display: 'inline-block',
    width: 'fit-content', margin: '6px auto 0' },
  legend: { position: 'absolute', left: 12, bottom: 12, background: '#fff', border: '2.5px solid #000',
    padding: '5px 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1,
    boxShadow: '3px 3px 0 #000', display: 'inline-flex', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 999, background: '#FFD60A', border: '2px solid #000',
    animation: 'nm-pulse 1.2s infinite' },
}

// ── Agent Character Card ───────────────────────────────────────────────────
function AgentCard({ agentName, idx, topology, ens }: {
  agentName: string; idx: number
  topology: AgentOnlineStatus | undefined
  ens: AgentENSData | undefined
}) {
  const [hover, setHover] = useState(false)
  const meta = AGENT_META[agentName]!
  const config = AGENTS.find((a) => a.name === agentName)
  const online = topology?.online ?? false
  const AvatarComp = meta.Avatar

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...ac.card, transform: hover ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hover ? '9px 11px 0 #000' : '6px 6px 0 #000' }}>
      <div style={{ ...ac.portrait, background: meta.color }}>
        <div style={ac.idx}>0{idx + 1}</div>
        <AvatarComp size={110} />
        <div style={ac.role}>{meta.role}</div>
        <div style={{ ...ac.statusChip, background: online ? '#06D6A0' : '#FF5C5C' }}>
          <span style={ac.statusDot} />{online ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>

      <div style={ac.nameStrip}>
        <div style={ac.name}>{agentName.toUpperCase()}</div>
        <a href={`${ENS_APP}/${config?.ensName ?? ''}`} target="_blank" rel="noreferrer" style={ac.ensLink}>
          <img src="https://cryptologos.cc/logos/ethereum-name-service-ens-logo.svg"
            width="20" height="20" alt="ENS" style={{ flexShrink: 0 }} />
          <span>{config?.ensName ?? ''}</span>
          <span style={ac.ensArrow}>↗</span>
        </a>
      </div>

      <div style={ac.stats}>
        <StatBox label="REP"   value={ens?.reputation != null ? `${ens.reputation}` : '—'} suffix="/100" color={meta.color} />
        <StatBox label="TASKS" value={ens?.taskCount != null ? ens.taskCount.toLocaleString() : '—'} />
        <StatBox label="PEERS" value={topology?.peerCount != null ? String(topology.peerCount) : '—'} />
        <StatBox label="VER"   value={ens?.version ?? '—'} mono />
      </div>

      {ens?.reputation != null && (
        <div style={ac.repWrap}>
          <div style={ac.repTrack}>
            <div style={{ ...ac.repFill, width: `${ens.reputation}%`, background: meta.color }} />
          </div>
        </div>
      )}

      <div style={ac.foot}>
        <span>:{config?.port}</span>
        <span>·</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ens?.model ?? '—'}</span>
      </div>
    </div>
  )
}

function StatBox({ label, value, suffix, mono, color }: {
  label: string; value: string; suffix?: string; mono?: boolean; color?: string
}) {
  return (
    <div style={ac.statBox}>
      <div style={ac.statLabel}>{label}</div>
      <div style={{ ...ac.statValue, ...(mono ? { fontFamily: "'JetBrains Mono', monospace", fontSize: 12 } : {}),
        ...(color ? { color } : {}) }}>
        {value}{suffix && <span style={ac.statSuffix}>{suffix}</span>}
      </div>
    </div>
  )
}

const ac: Record<string, CSSProperties> = {
  card: { background: '#fff', border: '3px solid #000', transition: 'transform 160ms ease, box-shadow 160ms ease',
    display: 'flex', flexDirection: 'column', minWidth: 0 },
  portrait: { position: 'relative', height: 170, borderBottom: '3px solid #000', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center' },
  idx: { position: 'absolute', top: 8, left: 10, fontFamily: "'Archivo Black', sans-serif", fontSize: 13,
    background: '#000', color: '#fff', padding: '2px 6px' },
  role: { position: 'absolute', bottom: 8, left: 10, fontFamily: "'Archivo Black', sans-serif", fontSize: 11,
    letterSpacing: 1.5, background: '#000', color: '#fff', padding: '3px 7px' },
  statusChip: { position: 'absolute', top: 8, right: 8, border: '2.5px solid #000',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1,
    padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '2px 2px 0 #000' },
  statusDot: { width: 7, height: 7, borderRadius: 999, background: '#000' },
  nameStrip: { padding: '10px 14px 8px', display: 'flex', flexDirection: 'column', gap: 6 },
  name: { fontFamily: "'Archivo Black', sans-serif", fontSize: 20, letterSpacing: -0.5, lineHeight: '1' },
  ensLink: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    border: '2.5px solid #000', padding: '6px 10px',
    background: '#F0F4FF', textDecoration: 'none', color: '#0A0A0A',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
    boxShadow: '3px 3px 0 #5298FF', letterSpacing: 0.3,
  },
  ensArrow: { marginLeft: 'auto', color: '#5298FF', fontSize: 14, fontWeight: 700 },
  stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '2px solid #000', borderBottom: '2px solid #000' },
  statBox: { padding: '8px 12px', borderRight: '1px solid #000', borderBottom: '1px solid #000' },
  statLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#666', letterSpacing: 1.2 },
  statValue: { fontFamily: "'Archivo Black', sans-serif", fontSize: 15, marginTop: 2 },
  statSuffix: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#888', marginLeft: 2, fontWeight: 400 },
  repWrap: { padding: '10px 10px 4px' },
  repTrack: { height: 12, background: '#EFEFE8', border: '2px solid #000',
    boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.18)', overflow: 'hidden' },
  repFill: { height: '100%', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15), inset 0 2px 0 rgba(255,255,255,0.5)',
    transition: 'width 400ms' },
  foot: { padding: '6px 12px 12px', display: 'flex', gap: 6,
    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#666' },
}

// ── Evolution Panel ────────────────────────────────────────────────────────
function EvolutionPanel({ ensAgents }: { ensAgents: AgentENSData[] }) {
  const [localTasks, setLocalTasks] = useState<Array<{ ts: number; num: number }>>([])
  const [, setTimerTick] = useState(0)

  useEffect(() => {
    const handler = () => setLocalTasks((prev) => [...prev, { ts: Date.now(), num: prev.length + 1 }])
    window.addEventListener('neuralmesh:task-complete', handler)
    return () => window.removeEventListener('neuralmesh:task-complete', handler)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTimerTick((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const researcher = ensAgents.find((e) => e.ensName === 'researcher.neuralmesh.eth')
  const ensTaskCount = researcher?.taskCount ?? 0
  const totalTasks = ensTaskCount + localTasks.length
  const tasksToward = totalTasks % EVOLUTION_THRESHOLD
  const pct = (tasksToward / EVOLUTION_THRESHOLD) * 100
  const gen = Math.floor(totalTasks / EVOLUTION_THRESHOLD)

  const recentLocal = [...localTasks].reverse().slice(0, 4)

  function fmtElapsed(ts: number) {
    const sec = Math.round((Date.now() - ts) / 1000)
    if (sec < 60) return `${sec}s ago`
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
    return `${Math.floor(sec / 3600)}h ago`
  }

  return (
    <div style={ev.wrap}>
      <div style={ev.head}>
        <div>
          <div style={ev.eyebrow}>RESEARCHER · ON-CHAIN EVOLUTION</div>
          <div style={ev.title}>NEXT DESCENT</div>
        </div>
        <div style={ev.gen}>
          <span style={ev.genK}>GEN</span>
          <span style={ev.genV}>{gen}</span>
        </div>
      </div>

      <div style={ev.barWrap}>
        <div style={ev.bar}>
          <div style={{ ...ev.fill, width: `${pct}%` }}>
            {pct > 8 && <span style={ev.fillLabel}>{Math.floor(pct)}%</span>}
          </div>
        </div>
        <div style={ev.legend}>
          <span>{tasksToward} / {EVOLUTION_THRESHOLD} tasks</span>
          <span>·</span>
          <span>{localTasks.length > 0 ? `${localTasks.length} completed this session` : `complete tasks to evolve`}</span>
        </div>
      </div>

      <div style={ev.history}>
        {recentLocal.length > 0 ? (
          recentLocal.map((task, i) => (
            <div key={task.ts} style={{ ...ev.histRow, opacity: 1 - i * 0.2 }}>
              <span style={ev.histGen}>TASK {String(localTasks.length - i).padStart(3, '0')}</span>
              <span style={ev.histDots}>· · · · · · · · · · · · · · · · · · ·</span>
              <span style={ev.histRep}>+1 task</span>
              <span style={ev.histTime}>{fmtElapsed(task.ts)}</span>
            </div>
          ))
        ) : (
          <div style={ev.emptyHist}>
            Submit a task above — evolution history appears here
          </div>
        )}
      </div>
    </div>
  )
}

const ev: Record<string, CSSProperties> = {
  wrap: { border: '3px solid #000', boxShadow: '6px 6px 0 #06D6A0', background: '#fff', padding: 18,
    display: 'flex', flexDirection: 'column', gap: 14 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#666' },
  title: { fontFamily: "'Archivo Black', sans-serif", fontSize: 28, letterSpacing: -0.8, lineHeight: '0.9' },
  gen: { display: 'flex', alignItems: 'baseline', gap: 6, border: '3px solid #000',
    padding: '4px 12px', boxShadow: '3px 3px 0 #000' },
  genK: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#666', letterSpacing: 1.5 },
  genV: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22 },
  barWrap: { display: 'flex', flexDirection: 'column', gap: 8 },
  bar: { height: 34, border: '3px solid #000', background: '#EFEFE8',
    boxShadow: 'inset 3px 3px 0 rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden' },
  fill: { height: '100%',
    background: 'repeating-linear-gradient(45deg,#06D6A0 0 8px,#04C091 8px 16px)',
    boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.18), inset 0 3px 0 rgba(255,255,255,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    padding: '0 10px', transition: 'width 400ms' },
  fillLabel: { fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#000' },
  legend: { display: 'flex', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#666' },
  history: { display: 'flex', flexDirection: 'column', borderTop: '2px dashed #000', paddingTop: 10, gap: 2 },
  histRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11 },
  histGen: { fontWeight: 700, color: '#000', minWidth: 72 },
  histDots: { flex: 1, color: '#bbb', overflow: 'hidden', whiteSpace: 'nowrap' },
  histRep: { color: '#06A381', fontWeight: 700 },
  histTime: { color: '#888', minWidth: 60, textAlign: 'right' },
  emptyHist: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#aaa',
    padding: '10px 0', fontStyle: 'italic' },
}

// ── Header ─────────────────────────────────────────────────────────────────
function Header({ onlineCount, totalTasks, researcherVersion }: {
  onlineCount: number; totalTasks: number; researcherVersion: string
}) {
  return (
    <header style={hdr.wrap}>
      <div style={hdr.left}>
        <div style={hdr.tag}>OPEN MESH · SEPOLIA TESTNET</div>
        <div style={hdr.wordmark}>
          <span>NEURAL</span>
          <span style={hdr.slash}>/</span>
          <span>MESH</span>
        </div>
        <div style={hdr.tagline}>Five autonomous agents. They research anything. They pay each other. They evolve on-chain.</div>
      </div>

      <div style={hdr.right}>
        <div style={hdr.onlinePill}>
          <span style={{ ...hdr.dot, animation: onlineCount > 0 ? 'nm-pulse 1.4s infinite' : 'none' }} />
          <span style={hdr.onlineNum}>{onlineCount}/5</span>
          <span style={hdr.onlineLabel}>AGENTS ONLINE</span>
        </div>
        <div style={hdr.metaRow}>
          {totalTasks > 0 && (
            <div style={hdr.metaCell}>
              <span style={hdr.metaK}>TASKS</span>
              <span style={hdr.metaV}>{totalTasks.toLocaleString()}</span>
            </div>
          )}
          {researcherVersion !== '—' && (
            <div style={hdr.metaCell}>
              <span style={hdr.metaK}>RESEARCHER</span>
              <span style={hdr.metaV}>{researcherVersion}</span>
            </div>
          )}
          <div style={hdr.metaCell}>
            <span style={hdr.metaK}>NETWORK</span>
            <span style={hdr.metaV}>SEPOLIA</span>
          </div>
        </div>
      </div>
    </header>
  )
}

const hdr: Record<string, CSSProperties> = {
  wrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24,
    padding: '28px 32px 22px', borderBottom: '3px solid #000', background: '#FAFAF8', flexWrap: 'wrap' },
  left: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  tag: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#000',
    background: '#FFD60A', border: '2.5px solid #000', padding: '2px 8px', width: 'fit-content', boxShadow: '2px 2px 0 #000' },
  wordmark: { fontFamily: "'Archivo Black', sans-serif", fontSize: 80, lineHeight: '0.85',
    letterSpacing: -4, color: '#0A0A0A', display: 'flex', alignItems: 'baseline' },
  slash: { color: '#F72585', margin: '0 -4px' },
  tagline: { fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#333', maxWidth: 500, marginTop: 4 },
  right: { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' },
  onlinePill: { display: 'inline-flex', alignItems: 'center', gap: 10, border: '3px solid #000',
    background: '#fff', padding: '8px 16px', boxShadow: '5px 5px 0 #000' },
  dot: { width: 12, height: 12, borderRadius: 999, background: '#06D6A0', border: '2px solid #000' },
  onlineNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22 },
  onlineLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.5, color: '#444' },
  metaRow: { display: 'flex', gap: 8 },
  metaCell: { border: '2.5px solid #000', padding: '4px 10px', background: '#fff',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, display: 'flex',
    flexDirection: 'column', minWidth: 80, boxShadow: '3px 3px 0 #000' },
  metaK: { color: '#888', letterSpacing: 1.2 },
  metaV: { color: '#000', fontWeight: 700 },
}

// ── App ────────────────────────────────────────────────────────────────────
export function App() {
  const { agents: topology, loading } = useAXLTopology(5000)
  const { agents: ensAgents } = useENSRecords(30000)

  const onlineCount  = topology.filter((a) => a.online).length
  const planner      = topology.find((a) => a.name === 'planner')
  const totalTasks   = ensAgents.reduce((s, a) => s + (a.taskCount ?? 0), 0)
  const researcherV  = ensAgents.find((e) => e.ensName === 'researcher.neuralmesh.eth')?.version ?? '—'

  return (
    <div style={app.page}>
      <Header onlineCount={loading ? 0 : onlineCount} totalTasks={totalTasks} researcherVersion={researcherV} />

      <main style={app.main}>
        {/* HERO */}
        <section style={app.hero}>
          <div style={app.heroLeft}><Playground agentsTopology={topology} /></div>
          <div style={app.heroRight}><TaskSubmit plannerOnline={planner?.online ?? false} /></div>
        </section>

        {/* AGENT CARDS */}
        <section style={app.section}>
          <div style={app.sectionHead}>
            <span style={app.eyebrow}>SECTION · 02</span>
            <span style={app.sectionTitle}>THE FIVE</span>
            <span style={app.sectionNote}>Each agent is an ENS identity, a model, a wallet, a port.</span>
          </div>
          <div style={app.agentRow}>
            {AGENTS.map((a, i) => (
              <AgentCard key={a.name} agentName={a.name} idx={i}
                topology={topology.find((t) => t.name === a.name)}
                ens={ensAgents.find((e) => e.ensName === a.ensName)} />
            ))}
          </div>
        </section>

        {/* EVOLUTION */}
        <section style={app.bottom}>
          <EvolutionPanel ensAgents={ensAgents} />
        </section>

        <footer style={app.footer}>
          <div>NEURALMESH · ETHGlobal</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="https://github.com/shivam-kumar25/open-agents-ethglobal-submission" target="_blank" rel="noreferrer" style={app.footLink}>github ↗</a>
            <a href={ENS_APP} target="_blank" rel="noreferrer" style={app.footLink}>app.ens.domains ↗</a>
          </div>
        </footer>
      </main>
    </div>
  )
}

const app: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: '#FAFAF8', color: '#0A0A0A' },
  main: { padding: '28px 32px 60px', display: 'flex', flexDirection: 'column', gap: 32,
    maxWidth: 1600, margin: '0 auto' },
  hero: { display: 'grid', gridTemplateColumns: 'minmax(0,4fr) minmax(0,6fr)', gap: 24, alignItems: 'stretch' },
  heroLeft: { minWidth: 0 },
  heroRight: { minWidth: 0 },
  section: { display: 'flex', flexDirection: 'column', gap: 16 },
  sectionHead: { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#666' },
  sectionTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 36, letterSpacing: -1.2 },
  sectionNote: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#888', marginLeft: 'auto' },
  agentRow: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 16 },
  bottom: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 24, alignItems: 'start' },
  footer: { display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '3px solid #000',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#666', letterSpacing: 1 },
  footLink: { color: '#666', textDecoration: 'none' },
}
