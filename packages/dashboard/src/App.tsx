import { useState, useEffect, useRef, type CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAXLTopology, type AgentOnlineStatus } from './hooks/useAXLTopology.js'
import { useENSRecords, type AgentENSData } from './hooks/useENSRecords.js'
import { TaskSubmit } from './components/TaskSubmit.js'
import { AGENTS, EVOLUTION_THRESHOLD, ENS_APP } from './config.js'

// ── Types ──────────────────────────────────────────────────────────────────
interface PlanStep { step: string; detail: string; ts: number }
interface TaskResult { taskId: string; result: string; score: number; processingTimeMs: number; steps: PlanStep[] }
type SseEvent =
  | { type: 'step'; step: string; detail: string; ts: number }
  | { type: 'done'; result: TaskResult }
  | { type: 'error'; error: string }

// ── SVG Avatar Components ──────────────────────────────────────────────────
type AvatarFC = (props: { size?: number }) => JSX.Element

function PlannerAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 80 C5 60 18 52 40 50 C62 52 75 60 75 80Z" fill="#1B263B"/>
      <rect x="4" y="50" width="14" height="6" rx="2" fill="#FFD60A"/>
      <rect x="62" y="50" width="14" height="6" rx="2" fill="#FFD60A"/>
      <circle cx="27" cy="62" r="3.5" fill="#FFD60A" stroke="#000" strokeWidth="0.8"/>
      <circle cx="40" cy="65" r="3.5" fill="#E63946" stroke="#000" strokeWidth="0.8"/>
      <circle cx="27" cy="71" r="3.5" fill="#2DC653" stroke="#000" strokeWidth="0.8"/>
      <rect x="34" y="42" width="12" height="10" fill="#F4A261"/>
      <ellipse cx="40" cy="30" rx="18" ry="19" fill="#F4A261"/>
      <path d="M22 22 Q40 10 58 22 L58 18 Q40 6 22 18Z" fill="#1B263B"/>
      <rect x="20" y="18" width="40" height="7" rx="2" fill="#1B263B"/>
      <ellipse cx="40" cy="25" rx="22" ry="3" fill="#0D1B2A"/>
      <polygon points="40,11 43.5,18 36.5,18" fill="#FFD60A"/>
      <ellipse cx="32" cy="30" rx="3" ry="3.5" fill="white"/>
      <ellipse cx="48" cy="30" rx="3" ry="3.5" fill="white"/>
      <circle cx="32.5" cy="30.5" r="1.8" fill="#1a1a1a"/>
      <circle cx="48.5" cy="30.5" r="1.8" fill="#1a1a1a"/>
      <path d="M28 25.5 L35 27" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
      <path d="M45 27 L52 25.5" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
      <path d="M33 39 L47 39" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function ResearcherAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 80 C5 60 18 52 40 50 C62 52 75 60 75 80Z" fill="white" stroke="#DDD" strokeWidth="1"/>
      <path d="M30 52 L26 70 L40 66 L54 70 L50 52Z" fill="white" stroke="#DDD" strokeWidth="1"/>
      <rect x="47" y="62" width="14" height="12" rx="1.5" fill="none" stroke="#CCC" strokeWidth="1.5"/>
      <circle cx="68" cy="56" r="9" fill="none" stroke="#00B4D8" strokeWidth="2.5"/>
      <line x1="74" y1="62.5" x2="78" y2="67" stroke="#00B4D8" strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="68" cy="56" r="5" fill="rgba(0,180,216,0.12)"/>
      <rect x="34" y="43" width="12" height="9" fill="#FDDCB5"/>
      <ellipse cx="40" cy="31" rx="18" ry="19" fill="#FDDCB5"/>
      <path d="M22 25 C20 16 16 7 22 5 C20 14 25 17 28 16 C26 8 29 2 35 3 C32 11 34 16 38 15 C38 8 41 2 47 4 C44 12 46 17 50 17 C52 11 56 7 59 12 C55 15 54 20 56 25" fill="#3D2B1F"/>
      <circle cx="31" cy="31" r="6.5" fill="rgba(255,255,255,0.3)" stroke="#333" strokeWidth="2"/>
      <circle cx="49" cy="31" r="6.5" fill="rgba(255,255,255,0.3)" stroke="#333" strokeWidth="2"/>
      <line x1="37.5" y1="31" x2="42.5" y2="31" stroke="#333" strokeWidth="2"/>
      <line x1="24.5" y1="31" x2="22" y2="28" stroke="#333" strokeWidth="2"/>
      <line x1="55.5" y1="31" x2="58" y2="28" stroke="#333" strokeWidth="2"/>
      <circle cx="31" cy="31" r="2.2" fill="#3D2B1F"/>
      <circle cx="49" cy="31" r="2.2" fill="#3D2B1F"/>
      <path d="M34 40 Q40 44 46 40" stroke="#555" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function ExecutorAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 80 C5 58 18 50 40 48 C62 50 75 58 75 80Z" fill="#111"/>
      <ellipse cx="11" cy="52" rx="10" ry="6" fill="#F72585"/>
      <ellipse cx="69" cy="52" rx="10" ry="6" fill="#F72585"/>
      <polygon points="46,52 36,66 42,66 35,80 54,62 45,62" fill="#F72585"/>
      <rect x="34" y="42" width="12" height="8" fill="#F4A261"/>
      <ellipse cx="40" cy="30" rx="18" ry="19" fill="#F4A261"/>
      <path d="M22 24 Q40 12 58 24 Q55 16 40 13 Q25 13 22 24Z" fill="#111"/>
      <path d="M22 28 Q40 20 58 28 L58 36 Q40 40 22 36Z" fill="#F72585" opacity="0.95"/>
      <path d="M22 28 Q40 20 58 28 L58 31 Q40 25 22 31Z" fill="white" opacity="0.2"/>
      <ellipse cx="31" cy="31.5" rx="5" ry="3.5" fill="white" opacity="0.9"/>
      <ellipse cx="49" cy="31.5" rx="5" ry="3.5" fill="white" opacity="0.9"/>
      <circle cx="31.5" cy="31.5" r="2.2" fill="#FF00AA"/>
      <circle cx="49.5" cy="31.5" r="2.2" fill="#FF00AA"/>
      <path d="M33 41 Q40 44.5 47 41" stroke="#d4a" strokeWidth="1.5" fill="none"/>
    </svg>
  )
}

function EvaluatorAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 80 C5 58 15 50 40 48 C65 50 75 58 75 80Z" fill="#2D1B4E"/>
      <path d="M30 50 L25 72 L40 67 L55 72 L50 50Z" fill="white"/>
      <rect x="57" y="52" width="20" height="9" rx="3" fill="#8B4513" transform="rotate(-30 57 52)"/>
      <rect x="63" y="58" width="4" height="18" rx="2" fill="#6B3410" transform="rotate(-30 63 58)"/>
      <line x1="12" y1="52" x2="12" y2="65" stroke="#FFD60A" strokeWidth="2"/>
      <line x1="5" y1="52" x2="19" y2="52" stroke="#FFD60A" strokeWidth="2"/>
      <path d="M5 52 L5 59 Q8.5 63 12 59 Q15.5 63 19 59 L19 52" stroke="#FFD60A" strokeWidth="1.5" fill="none"/>
      <rect x="34" y="40" width="12" height="10" fill="#FDDCB5"/>
      <ellipse cx="40" cy="28" rx="17" ry="18" fill="#FDDCB5"/>
      <path d="M23 22 Q21 9 27 7 Q25 16 30 17 Q27 7 36 7 Q33 16 38 17 Q36 7 44 8 Q41 17 46 17 Q43 8 52 11 Q49 19 55 22" fill="#F0F0F0"/>
      <path d="M23 22 Q17 26 18 38 Q21 37 22 35 Q23 29 25 26" fill="#F0F0F0"/>
      <path d="M57 22 Q63 26 62 38 Q59 37 58 35 Q57 29 55 26" fill="#F0F0F0"/>
      <ellipse cx="33" cy="27" rx="3.2" ry="3" fill="white"/>
      <ellipse cx="47" cy="27" rx="3.2" ry="3" fill="white"/>
      <circle cx="33.5" cy="27" r="1.8" fill="#2D1B4E"/>
      <circle cx="47.5" cy="27" r="1.8" fill="#2D1B4E"/>
      <path d="M30 23 Q33 21 36 23" stroke="#888" strokeWidth="1.5" fill="none"/>
      <path d="M44 23 Q47 21 50 23" stroke="#888" strokeWidth="1.5" fill="none"/>
      <path d="M35 36 Q40 37 45 36" stroke="#777" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function EvolutionAvatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 80 C8 57 19 49 40 47 C61 49 72 57 72 80Z" fill="#0D4A3C"/>
      <line x1="24" y1="55" x2="33" y2="55" stroke="#06D6A0" strokeWidth="1.5"/>
      <line x1="33" y1="55" x2="33" y2="70" stroke="#06D6A0" strokeWidth="1.5"/>
      <circle cx="33" cy="70" r="2.5" fill="#06D6A0"/>
      <line x1="47" y1="55" x2="56" y2="55" stroke="#06D6A0" strokeWidth="1.5"/>
      <line x1="47" y1="55" x2="47" y2="73" stroke="#06D6A0" strokeWidth="1.5"/>
      <circle cx="47" cy="73" r="2.5" fill="#06D6A0"/>
      <path d="M37 52 Q42 57 37 63 Q42 69 37 75" stroke="#06D6A0" strokeWidth="2" fill="none"/>
      <path d="M43 52 Q38 57 43 63 Q38 69 43 75" stroke="#06D6A0" strokeWidth="2" fill="none"/>
      <line x1="37" y1="57" x2="43" y2="57" stroke="#06D6A0" strokeWidth="1.5"/>
      <line x1="37" y1="63" x2="43" y2="63" stroke="#06D6A0" strokeWidth="1.5"/>
      <line x1="37" y1="69" x2="43" y2="69" stroke="#06D6A0" strokeWidth="1.5"/>
      <rect x="34" y="38" width="12" height="11" fill="#C5F5EC"/>
      <ellipse cx="40" cy="24" rx="23" ry="25" fill="#C5F5EC"/>
      <ellipse cx="32" cy="13" rx="9" ry="5.5" fill="rgba(255,255,255,0.3)" transform="rotate(-20 32 13)"/>
      <line x1="40" y1="0" x2="40" y2="9" stroke="#06D6A0" strokeWidth="2.5"/>
      <circle cx="40" cy="0" r="4" fill="#06D6A0"/>
      <line x1="20" y1="10" x2="14" y2="3" stroke="#06D6A0" strokeWidth="1.5"/>
      <circle cx="13" cy="2.5" r="2.5" fill="#06D6A0"/>
      <line x1="60" y1="10" x2="66" y2="3" stroke="#06D6A0" strokeWidth="1.5"/>
      <circle cx="67" cy="2.5" r="2.5" fill="#06D6A0"/>
      <ellipse cx="30" cy="26" rx="7" ry="6" fill="#06D6A0" opacity="0.9"/>
      <ellipse cx="50" cy="26" rx="7" ry="6" fill="#06D6A0" opacity="0.9"/>
      <ellipse cx="30" cy="26" rx="4.5" ry="4" fill="white" opacity="0.95"/>
      <ellipse cx="50" cy="26" rx="4.5" ry="4" fill="white" opacity="0.95"/>
      <circle cx="31" cy="26.5" r="2.2" fill="#003D30"/>
      <circle cx="51" cy="26.5" r="2.2" fill="#003D30"/>
      <path d="M33 37 L47 37" stroke="#06D6A0" strokeWidth="2.5" strokeLinecap="round"/>
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

// ── External service node — Gensyn AI compute ──────────────────────────────
const SERVICE_META: Record<string, { color: string; label: string; abbr: string; desc: string }> = {
  gensyn: { color: '#9B5DE5', label: 'GENSYN', abbr: 'G', desc: 'AI COMPUTE' },
}

function nodeColor(key: string): string {
  return AGENT_META[key]?.color ?? SERVICE_META[key]?.color ?? '#888'
}

// ── 3-D Playground data ────────────────────────────────────────────────────
const NODES: Record<string, { x: number; y: number; z: number }> = {
  planner:    { x: 0.50, y: 0.50, z: 80  },
  researcher: { x: 0.22, y: 0.28, z: 30  },
  executor:   { x: 0.78, y: 0.28, z: 30  },
  evaluator:  { x: 0.22, y: 0.78, z: -20 },
  evolution:  { x: 0.78, y: 0.78, z: -20 },
  // External service node — not an AI agent, rendered differently
  gensyn:     { x: 0.50, y: 0.06, z: 0   },
}

const LINKS: Array<[string, string]> = [
  // Agent↔agent interactions
  ['planner', 'researcher'],   // research task + x402 payment
  ['planner', 'executor'],     // on-chain action requests
  ['planner', 'evaluator'],    // quality scoring request (HTTP)
  ['researcher', 'evaluator'], // result quality assessment
  ['executor', 'evaluator'],   // execution audit trail
  ['evaluator', 'evolution'],  // reputation + training data
  ['planner', 'evolution'],    // gossip broadcast channel
  // Gensyn AI compute connections
  ['planner', 'gensyn'],       // decomposition + synthesis inference
  ['researcher', 'gensyn'],    // research inference
]

// What actually happens at each step (accurate to planner.ts flow)
const STEP_ACTIVE_LINKS: Record<string, Array<[string, string]>> = {
  THINKING:     [['planner', 'gensyn']],
  ROUTING:      [['planner', 'researcher']],
  RESEARCHING:  [['planner', 'researcher'], ['researcher', 'gensyn']],
  PAYING:       [['planner', 'researcher']],
  SYNTHESIZING: [['planner', 'gensyn']],
  SCORING:      [['planner', 'evaluator'], ['researcher', 'evaluator']],
  SCORED:       [['evaluator', 'evolution']],
  STORED:       [['evaluator', 'evolution']],
}

function linkIsActive(a: string, b: string, step: string | null | undefined): boolean {
  if (!step) return false
  return (STEP_ACTIVE_LINKS[step] ?? []).some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

// ── 3-D Collaboration Playground ──────────────────────────────────────────
function Playground({ agentsTopology, submitting, currentStep }: {
  agentsTopology: AgentOnlineStatus[]
  submitting?: boolean
  currentStep?: string | null
}) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let raf: number
    const loop = () => { setTick((t) => t + 1); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const onlineMap = Object.fromEntries(agentsTopology.map((a) => [a.name, a.online]))
  const showPaymentDot = currentStep === 'PAYING'
  const showCallDot = currentStep === 'SCORING'
  const PA = NODES['planner']!; const PB = NODES['researcher']!
  const PE = NODES['planner']!; const PF = NODES['evaluator']!
  const dotT = (Math.sin(tick / 25) + 1) / 2
  const globalPulse = (Math.sin(tick / 40) + 1) / 2

  const activeLinkLabel = currentStep
    ? (STEP_ACTIVE_LINKS[currentStep]?.[0]?.join(' → ') ?? null)
    : null

  return (
    <div style={pg.wrap}>
      <div style={pg.header}>
        <span style={pg.eyebrow}>SCENE · 03</span>
        <span style={pg.title}>COLLAB MESH</span>
        {currentStep
          ? <span style={pg.activeChip}>{currentStep}</span>
          : <span style={pg.note}>5 agents · 2 services</span>}
      </div>

      <div style={pg.scene}>
        <div style={{ ...pg.world, transform: 'rotateX(58deg)' }}>
          <div style={pg.floor} />

          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={pg.linkSvg}>
            <defs>
              {LINKS.map(([a, b]) => (
                <linearGradient key={`g${a}${b}`} id={`g${a}${b}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={nodeColor(a)} />
                  <stop offset="100%" stopColor={nodeColor(b)} />
                </linearGradient>
              ))}
            </defs>

            {LINKS.map(([a, b]) => {
              const A = NODES[a]!; const B = NODES[b]!
              const active = linkIsActive(a, b, currentStep)
              const isServiceLink = a in SERVICE_META || b in SERVICE_META
              return (
                <line key={`${a}-${b}`}
                  x1={A.x * 100} y1={A.y * 100} x2={B.x * 100} y2={B.y * 100}
                  stroke={active ? `url(#g${a}${b})` : '#888'}
                  strokeWidth={active ? 1.6 + globalPulse * 0.8 : (isServiceLink ? 0.4 : 0.5)}
                  strokeDasharray={isServiceLink && !active ? '2 3' : undefined}
                  opacity={active ? 0.75 + globalPulse * 0.25 : (submitting ? 0.15 : 0.07)}
                />
              )
            })}

            {/* x402 payment dot — planner → researcher (PAYING only) */}
            {showPaymentDot && (
              <circle
                cx={PA.x * 100 + (PB.x * 100 - PA.x * 100) * dotT}
                cy={PA.y * 100 + (PB.y * 100 - PA.y * 100) * dotT}
                r={1.8} fill="#FFD60A" stroke="#000" strokeWidth={0.4}
              />
            )}
            {/* Service call dot — planner → evaluator (SCORING) */}
            {showCallDot && (
              <circle
                cx={PE.x * 100 + (PF.x * 100 - PE.x * 100) * dotT}
                cy={PE.y * 100 + (PF.y * 100 - PE.y * 100) * dotT}
                r={1.5} fill="#7B2FBE" stroke="#fff" strokeWidth={0.5}
              />
            )}
          </svg>

          {/* Agent nodes */}
          {Object.entries(NODES)
            .filter(([key]) => key in AGENT_META)
            .map(([key, n]) => {
              const meta = AGENT_META[key]!
              const online = onlineMap[key] ?? true
              const pulse = (Math.sin((tick + key.length * 13) / 18) + 1) / 2
              const AvatarComp = meta.Avatar
              return (
                <div key={key} style={{
                  ...pg.nodeWrap,
                  left: `${n.x * 100}%`, top: `${n.y * 100}%`,
                  transform: `translate(-50%,-50%) translateZ(${n.z}px)`,
                }}>
                  <div style={{ transform: 'rotateX(-58deg)' }}>
                    <div style={{
                      ...pg.orb, background: meta.color,
                      boxShadow: online
                        ? `0 0 ${20 + pulse * 25}px ${meta.color}, 4px 4px 0 #000`
                        : '4px 4px 0 #000',
                      opacity: online ? 1 : 0.3,
                    }}>
                      <AvatarComp size={48} />
                    </div>
                    <div style={pg.orbLabel}>{key.toUpperCase()}</div>
                  </div>
                </div>
              )
            })}

          {/* External service nodes — Gensyn + KeeperHub */}
          {Object.entries(NODES)
            .filter(([key]) => key in SERVICE_META)
            .map(([key, n]) => {
              const meta = SERVICE_META[key]!
              const active = currentStep
                ? (STEP_ACTIVE_LINKS[currentStep] ?? []).some(([a, b]) => a === key || b === key)
                : false
              const pulse = (Math.sin((tick + key.length * 17) / 22) + 1) / 2
              return (
                <div key={key} style={{
                  ...pg.nodeWrap,
                  left: `${n.x * 100}%`, top: `${n.y * 100}%`,
                  transform: `translate(-50%,-50%) translateZ(${n.z}px)`,
                }}>
                  <div style={{ transform: 'rotateX(-58deg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 62, height: 62,
                      border: `2.5px ${active ? 'solid' : 'dashed'} ${meta.color}`,
                      background: active ? meta.color : `${meta.color}18`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 1,
                      transform: 'rotate(45deg)',
                      boxShadow: active ? `0 0 ${18 + pulse * 22}px ${meta.color}, 3px 3px 0 #000` : '3px 3px 0 #000',
                      transition: 'background 300ms, box-shadow 300ms, border-style 200ms',
                    }}>
                      <span style={{
                        transform: 'rotate(-45deg)',
                        fontFamily: "'Archivo Black', sans-serif",
                        fontSize: 18,
                        color: active ? '#000' : meta.color,
                        lineHeight: 1,
                      }}>{meta.abbr}</span>
                    </div>
                    <div style={{ ...pg.orbLabel, background: meta.color, color: '#000', marginTop: 6 }}>
                      {meta.label}
                    </div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 1,
                      color: active ? meta.color : '#aaa', marginTop: 2,
                    }}>{meta.desc}</div>
                  </div>
                </div>
              )
            })}
        </div>

        {activeLinkLabel && (
          <div style={pg.legend}>
            <span style={pg.legendDot} />
            <span>ACTIVE: {activeLinkLabel}</span>
          </div>
        )}
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
  activeChip: { marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
    letterSpacing: 1.5, background: '#06D6A0', border: '2px solid #000', padding: '2px 8px',
    animation: 'nm-pulse 1.2s infinite' },
  scene: { position: 'relative', flex: 1, minHeight: 380, perspective: '1200px', perspectiveOrigin: '50% 40%',
    background: 'repeating-linear-gradient(45deg,#FAFAF8 0 12px,#F2F0E8 12px 24px)',
    border: '3px solid #000', overflow: 'hidden' },
  world: { position: 'absolute', inset: 0, transformStyle: 'preserve-3d' },
  floor: { position: 'absolute', inset: 0,
    background: "repeating-linear-gradient(0deg,transparent 0 24px,rgba(0,0,0,0.06) 24px 25px),repeating-linear-gradient(90deg,transparent 0 24px,rgba(0,0,0,0.06) 24px 25px)" },
  linkSvg: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  nodeWrap: { position: 'absolute', transformStyle: 'preserve-3d' },
  orb: { width: 80, height: 80, borderRadius: '50%', border: '3px solid #000',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'box-shadow 200ms', overflow: 'hidden' },
  orbLabel: { textAlign: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: 10,
    letterSpacing: 1.5, background: '#000', color: '#fff', padding: '2px 6px', display: 'inline-block',
    width: 'fit-content', margin: '6px auto 0' },
  legend: { position: 'absolute', left: 12, bottom: 12, background: '#fff', border: '2.5px solid #000',
    padding: '5px 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1,
    boxShadow: '3px 3px 0 #000', display: 'inline-flex', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 999, background: '#FFD60A', border: '2px solid #000',
    animation: 'nm-pulse 1.2s infinite', flexShrink: 0 },
}

// ── Step metadata ──────────────────────────────────────────────────────────
const STEP_LABELS: Record<string, string> = {
  RECEIVED: 'RECEIVED', THINKING: 'PLANNING', ROUTING: 'ROUTING',
  RESEARCHING: 'RESEARCHING', PAYING: 'PAYING', SYNTHESIZING: 'SYNTHESIZING',
  SCORING: 'SCORING', SCORED: 'SCORED', STORED: 'STORED',
}
const STEP_AGENTS: Record<string, string> = {
  RECEIVED:     'planner',
  THINKING:     'planner → Gensyn compute',
  ROUTING:      'Sepolia ENS lookup',
  RESEARCHING:  'researcher + Gensyn AI',
  PAYING:       'x402 payment → researcher',
  SYNTHESIZING: 'planner + Gensyn AI',
  SCORING:      'planner → evaluator',
  SCORED:       'evaluator → Sepolia ENS',
  STORED:       '0G Storage',
}

// ── Live Log Panel ─────────────────────────────────────────────────────────
function LiveLog({ steps, submitting, result }: {
  steps: PlanStep[]
  submitting: boolean
  result: TaskResult | null
}) {
  const allSteps = result?.steps ?? steps
  const isLive = submitting && !result
  const visible = allSteps.filter((s) => s.step in STEP_LABELS)

  return (
    <div style={ll.wrap}>
      <div style={ll.head}>
        <div>
          <div style={ll.eyebrow}>MESH LOG</div>
          <div style={ll.title}>{isLive ? 'IN PROGRESS' : result ? 'COMPLETE' : 'READY'}</div>
        </div>
        {isLive && (
          <div style={ll.liveChip}>
            <span style={ll.liveDot} />LIVE
          </div>
        )}
        {result && <div style={ll.doneChip}>✓ {visible.length} STEPS</div>}
      </div>

      <div style={ll.steps}>
        {isLive && visible.length === 0 && (
          <div style={ll.waiting}>
            <span style={{ animation: 'nm-blink 0.8s infinite', marginRight: 8 }}>●</span>
            connecting to agents...
          </div>
        )}
        {visible.map((s, i) => {
          const isCurrent = isLive && i === visible.length - 1
          const elapsedSec = result
            ? ((s.ts - (allSteps[0]?.ts ?? s.ts)) / 1000).toFixed(1) + 's'
            : null
          return (
            <div key={i} style={{
              ...ll.row,
              borderLeft: `3px solid ${isCurrent ? '#06D6A0' : result ? '#000' : '#ccc'}`,
              background: isCurrent ? 'rgba(6,214,160,0.05)' : 'transparent',
              animation: 'nm-slide-in 0.25s ease both',
              animationDelay: `${i * 0.04}s`,
            }}>
              <div style={ll.rowTop}>
                <span style={{ ...ll.idx, background: isCurrent ? '#06D6A0' : result ? '#000' : '#999' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={ll.stepName}>{STEP_LABELS[s.step] ?? s.step}</span>
                <span style={ll.agentName}>{STEP_AGENTS[s.step] ?? ''}</span>
                {elapsedSec && <span style={ll.timeStamp}>{elapsedSec}</span>}
                {isCurrent && <span style={{ ...ll.timeStamp, animation: 'nm-blink 0.7s infinite' }}>●</span>}
              </div>
              {s.detail && <div style={ll.detail}>{s.detail.slice(0, 80)}</div>}
            </div>
          )
        })}
      </div>

      {result && (
        <div style={ll.scoreRow}>
          <span style={ll.scoreK}>SCORE</span>
          <span style={{ ...ll.scoreV, color: result.score >= 80 ? '#06A381' : '#E07000' }}>
            {result.score}/100
          </span>
          <span style={ll.scoreNote}>· {(result.processingTimeMs / 1000).toFixed(1)}s total · Sepolia ENS</span>
        </div>
      )}
    </div>
  )
}

const ll: Record<string, CSSProperties> = {
  wrap: { border: '3px solid #000', boxShadow: '6px 6px 0 #000', background: '#fff',
    padding: 20, display: 'flex', flexDirection: 'column', gap: 12, height: '100%' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#666' },
  title: { fontFamily: "'Archivo Black', sans-serif", fontSize: 24, letterSpacing: -0.6, lineHeight: '1.1' },
  liveChip: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#000', color: '#06D6A0',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    padding: '4px 10px', border: '2px solid #06D6A0', flexShrink: 0 },
  liveDot: { width: 7, height: 7, borderRadius: 999, background: '#06D6A0',
    animation: 'nm-pulse 1s infinite', flexShrink: 0 },
  doneChip: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
    border: '2px solid #000', padding: '3px 10px', background: '#F5F5F0', flexShrink: 0 },
  steps: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflowY: 'auto' },
  waiting: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#888', padding: '12px 0' },
  row: { padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 3,
    borderBottom: '1px solid rgba(0,0,0,0.07)', transition: 'background 200ms' },
  rowTop: { display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' },
  idx: { color: '#fff', fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
    padding: '1px 5px', flexShrink: 0, minWidth: 26, textAlign: 'center' },
  stepName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 13, letterSpacing: 0.5, flexShrink: 0 },
  agentName: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#777',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  timeStamp: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#888', flexShrink: 0 },
  detail: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#555',
    paddingLeft: 34, lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  scoreRow: { display: 'flex', alignItems: 'center', gap: 8, borderTop: '2.5px solid #000',
    paddingTop: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, flexWrap: 'wrap' },
  scoreK: { color: '#666' },
  scoreV: { fontWeight: 700, fontSize: 16 },
  scoreNote: { color: '#aaa', fontSize: 11 },
}

// ── Answer Pane ────────────────────────────────────────────────────────────
function AnswerPane({ result, error, submitting }: {
  result: TaskResult | null
  error: string | null
  submitting: boolean
}) {
  if (error && !result) {
    return (
      <div style={{ ...ap.card, borderColor: '#FF5C5C', boxShadow: '6px 6px 0 #FF5C5C' }}>
        <div style={ap.eyebrow}>ERROR</div>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 8, color: '#CC0000' }}>
          CANNOT REACH PLANNER
        </div>
        <div style={ap.bodyText}>{error}</div>
        <div style={{ ...ap.foot, color: '#CC3333' }}>Run: pnpm start:agents</div>
      </div>
    )
  }

  if (!result) {
    return (
      <div style={ap.card}>
        <div style={ap.skHead}>
          <div style={ap.eyebrow}>FINAL · ANSWER</div>
          <div style={{ width: 90, height: 26, background: '#E8E8E0', borderRadius: 3,
            animation: 'nm-shimmer 1.4s ease-in-out infinite' }} />
        </div>
        <div style={ap.skBody}>
          {[92, 78, 86, 64, 80, 56, 73, 48, 67, 82, 44].map((w, i) => (
            <div key={i} style={{
              height: i === 0 ? 15 : 12, width: `${w}%`, background: '#E8E8E0',
              borderRadius: 2, marginBottom: i === 0 ? 12 : 7,
              animation: `nm-shimmer 1.6s ease-in-out ${(i * 0.1).toFixed(1)}s infinite`,
            }} />
          ))}
        </div>
        <div style={ap.computing}>
          <span style={{ color: '#06D6A0', animation: 'nm-pulse 1s infinite', marginRight: 8 }}>●</span>
          COMPUTING ANSWER VIA AI MESH...
        </div>
      </div>
    )
  }

  return (
    <div style={{ ...ap.card, boxShadow: '6px 6px 0 #06D6A0' }}>
      <div style={ap.head}>
        <div style={ap.eyebrow}>FINAL · ANSWER</div>
        <div style={{ ...ap.scoreBadge, background: result.score >= 80 ? '#06D6A0' : '#FFD60A' }}>
          SCORE <b>{result.score}/100</b>
        </div>
      </div>
      <div style={ap.bodyText}>
        <ReactMarkdown
          components={{
            h1: ({ children }) => <h1 style={ap.mdH1}>{children}</h1>,
            h2: ({ children }) => <h2 style={ap.mdH2}>{children}</h2>,
            h3: ({ children }) => <h3 style={ap.mdH3}>{children}</h3>,
            p:  ({ children }) => <p  style={ap.mdP}>{children}</p>,
            ul: ({ children }) => <ul style={ap.mdUl}>{children}</ul>,
            ol: ({ children }) => <ol style={ap.mdOl}>{children}</ol>,
            li: ({ children }) => <li style={ap.mdLi}>{children}</li>,
            strong: ({ children }) => <strong style={ap.mdStrong}>{children}</strong>,
            em: ({ children }) => <em style={ap.mdEm}>{children}</em>,
            code: ({ children }) => <code style={ap.mdCode}>{children}</code>,
          }}
        >{result.result}</ReactMarkdown>
      </div>
      <div style={ap.foot}>
        <span>Scored by evaluator.neuralmesh.eth</span>
        <span>·</span>
        <span>Written to Sepolia ENS</span>
        <span>·</span>
        <span>{(result.processingTimeMs / 1000).toFixed(1)}s total</span>
      </div>
    </div>
  )
}

const ap: Record<string, CSSProperties> = {
  card: { background: '#fff', border: '3px solid #000', boxShadow: '6px 6px 0 #000',
    padding: 24, display: 'flex', flexDirection: 'column', gap: 14, height: '100%' },
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#666' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '2px solid #000', paddingBottom: 12 },
  scoreBadge: { border: '2px solid #000', padding: '3px 10px',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12 },
  bodyText: { fontFamily: "'Inter', sans-serif", fontSize: 16, lineHeight: '1.7', color: '#0A0A0A', flex: 1 },
  foot: { display: 'flex', gap: 8, flexWrap: 'wrap', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: '#666', borderTop: '1px dashed #000', paddingTop: 10 },
  skHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '2px solid #EEE', paddingBottom: 12 },
  skBody: { display: 'flex', flexDirection: 'column', flex: 1 },
  computing: { display: 'flex', alignItems: 'center', fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11, color: '#888', borderTop: '1px dashed #CCC', paddingTop: 10 },
  // Markdown element styles
  mdH1:     { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, letterSpacing: -0.5,
               margin: '18px 0 8px', color: '#0A0A0A', lineHeight: 1.2 },
  mdH2:     { fontFamily: "'Archivo Black', sans-serif", fontSize: 18, letterSpacing: -0.3,
               margin: '16px 0 6px', color: '#0A0A0A', lineHeight: 1.2 },
  mdH3:     { fontFamily: "'Archivo Black', sans-serif", fontSize: 15, letterSpacing: 0.2,
               margin: '14px 0 5px', color: '#0A0A0A', lineHeight: 1.3,
               borderBottom: '2px solid #F0EFE8', paddingBottom: 4 },
  mdP:      { margin: '0 0 10px', lineHeight: '1.75' },
  mdUl:     { margin: '6px 0 10px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 },
  mdOl:     { margin: '6px 0 10px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 4 },
  mdLi:     { lineHeight: '1.65' },
  mdStrong: { fontWeight: 700, color: '#0A0A0A' },
  mdEm:     { fontStyle: 'italic', color: '#444' },
  mdCode:   { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, background: '#F0EFE8',
               padding: '1px 5px', border: '1px solid #DDD' },
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
        <span>:{config?.port != null ? config.port + 1 : '—'}</span>
        <span>·</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ens?.model ?? '—'}
        </span>
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
      <div style={{ ...ac.statValue,
        ...(mono ? { fontFamily: "'JetBrains Mono', monospace", fontSize: 12 } : {}),
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
  ensLink: { display: 'inline-flex', alignItems: 'center', gap: 7, border: '2.5px solid #000',
    padding: '6px 10px', background: '#F0F4FF', textDecoration: 'none', color: '#0A0A0A',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
    boxShadow: '3px 3px 0 #5298FF', letterSpacing: 0.3 },
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
  const recent = [...localTasks].reverse().slice(0, 4)

  function fmtElapsed(ts: number) {
    const s = Math.round((Date.now() - ts) / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    return `${Math.floor(s / 3600)}h ago`
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
          <span>{localTasks.length > 0 ? `${localTasks.length} this session` : 'complete tasks to evolve'}</span>
        </div>
      </div>

      <div style={ev.history}>
        {recent.length > 0 ? (
          recent.map((task, i) => (
            <div key={task.ts} style={{ ...ev.histRow, opacity: 1 - i * 0.2 }}>
              <span style={ev.histGen}>TASK {String(localTasks.length - i).padStart(3, '0')}</span>
              <span style={ev.histDots}>· · · · · · · · · · · · · · · · · · ·</span>
              <span style={ev.histRep}>+1 task</span>
              <span style={ev.histTime}>{fmtElapsed(task.ts)}</span>
            </div>
          ))
        ) : (
          <div style={ev.emptyHist}>Submit a task above — evolution history appears here</div>
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
        <div style={hdr.wordmarkRow}>
          <img src="/icon.svg" alt="NeuralMesh" style={hdr.logoIcon} />
          <div style={hdr.wordmark}>
            <span>NEURAL</span>
            <span style={hdr.slash}>/</span>
            <span>MESH</span>
          </div>
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
  wordmarkRow: { display: 'flex', alignItems: 'center', gap: 16 },
  logoIcon: { width: 72, height: 72, border: '3px solid #000', boxShadow: '4px 4px 0 #FFD60A',
    flexShrink: 0, display: 'block' },
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

  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [liveSteps, setLiveSteps] = useState<PlanStep[]>([])
  const [result, setResult] = useState<TaskResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  async function handleSubmit() {
    if (!query.trim() || submitting) return
    setSubmitting(true)
    setLiveSteps([])
    setResult(null)
    setError(null)
    setElapsed(0)

    const startMs = Date.now()
    timerRef.current = setInterval(() => setElapsed((Date.now() - startMs) / 1000), 200)

    // Scroll to output section after a tick so it renders first
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)

    try {
      const res = await fetch('/planner-api/api/tasks/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const ev = JSON.parse(line.slice(6)) as SseEvent
                if (ev.type === 'step') {
                  setLiveSteps((prev) => [...prev, { step: ev.step, detail: ev.detail, ts: ev.ts }])
                } else if (ev.type === 'done') {
                  setResult(ev.result)
                  window.dispatchEvent(new CustomEvent('neuralmesh:task-complete'))
                } else if (ev.type === 'error') {
                  setError(ev.error)
                }
              } catch { /* skip */ }
            }
          }
        }
      }
    } catch (e) {
      setError(`Cannot reach planner — is pnpm start:agents running? (${String(e)})`)
    } finally {
      clearInterval(timerRef.current!)
      setSubmitting(false)
    }
  }

  const currentStep = liveSteps[liveSteps.length - 1]?.step ?? null
  const showOutput = submitting || result !== null || error !== null
  const planner = topology.find((a) => a.name === 'planner')
  const onlineCount = topology.filter((a) => a.online).length
  const totalTasks = ensAgents.reduce((s, a) => s + (a.taskCount ?? 0), 0)
  const researcherV = ensAgents.find((e) => e.ensName === 'researcher.neuralmesh.eth')?.version ?? '—'

  return (
    <div style={app.page}>
      <Header onlineCount={loading ? 0 : onlineCount} totalTasks={totalTasks} researcherVersion={researcherV} />

      <main style={app.main}>
        {/* HERO — fixed layout, never stretches when output appears */}
        <section style={app.hero}>
          <div style={app.heroLeft}>
            <Playground agentsTopology={topology} submitting={submitting} currentStep={currentStep} />
          </div>
          <div style={app.heroRight}>
            <TaskSubmit
              query={query} setQuery={setQuery} onSubmit={handleSubmit}
              submitting={submitting} elapsed={elapsed}
              plannerOnline={planner?.online ?? false}
            />
          </div>
        </section>

        {/* OUTPUT — full width, below hero */}
        {showOutput && (
          <section ref={outputRef} style={app.outputSection}>
            <div style={app.logPane}>
              <LiveLog steps={liveSteps} submitting={submitting} result={result} />
            </div>
            <div style={app.answerPane}>
              <AnswerPane result={result} error={error} submitting={submitting} />
            </div>
          </section>
        )}

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
          <a href="https://github.com/shivam-kumar25/open-agents-ethglobal-submission" target="_blank" rel="noopener noreferrer" style={app.footLink}>github ↗</a>
        </footer>
      </main>
    </div>
  )
}

const app: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: '#FAFAF8', color: '#0A0A0A' },
  main: { padding: '28px 32px 60px', display: 'flex', flexDirection: 'column', gap: 32,
    maxWidth: 1600, margin: '0 auto' },
  hero: { display: 'grid', gridTemplateColumns: 'minmax(0,4fr) minmax(0,6fr)', gap: 24,
    alignItems: 'start' },
  heroLeft: { minWidth: 0 },
  heroRight: { minWidth: 0 },
  outputSection: { display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,3fr)', gap: 20,
    alignItems: 'stretch', minHeight: 440,
    animation: 'nm-slide-in 0.3s ease both' },
  logPane: { minWidth: 0 },
  answerPane: { minWidth: 0 },
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
