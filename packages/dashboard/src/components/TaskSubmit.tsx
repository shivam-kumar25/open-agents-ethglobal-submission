import { type CSSProperties } from 'react'

const EXAMPLES = [
  { text: 'Compare Rust vs Go for high-performance backend services', tone: '#FFE066' },
  { text: 'Explain how zero-knowledge proofs work and where they are used', tone: '#B8E1FF' },
  { text: 'What are the tradeoffs between layer-2 scaling solutions in 2025?', tone: '#FFB8D9' },
  { text: 'How do transformer attention mechanisms work under the hood?', tone: '#C8F7C5' },
  { text: 'Compare the top AI models of 2025 and their key strengths', tone: '#E0C8FF' },
]

interface Props {
  query: string
  setQuery: (q: string) => void
  onSubmit: () => void
  submitting: boolean
  elapsed: number
  plannerOnline: boolean
}

export function TaskSubmit({ query, setQuery, onSubmit, submitting, elapsed, plannerOnline }: Props) {
  return (
    <div style={ts.wrap}>
      <div style={ts.header}>
        <div>
          <div style={ts.eyebrow}>SUBMIT.TASK</div>
          <div style={ts.title}>ASK THE MESH</div>
        </div>
        <div style={{ ...ts.statusPill, background: plannerOnline ? '#06D6A0' : '#FF5C5C' }}>
          <span style={ts.dot} />
          {plannerOnline ? 'PLANNER ONLINE' : 'PLANNER OFFLINE'}
        </div>
      </div>

      <div style={ts.well}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit() }}
          placeholder="Type a question. The mesh decomposes it, researches, evaluates, evolves."
          style={ts.textarea}
          disabled={submitting}
          rows={4}
        />
        <div style={ts.wellFoot}>
          <div style={ts.charCount}>{query.length} CHARS · CTRL+ENTER</div>
          <button
            onClick={onSubmit}
            disabled={!query.trim() || submitting || !plannerOnline}
            style={{ ...ts.submitBtn, ...(!query.trim() || submitting || !plannerOnline ? ts.submitDisabled : {}) }}
            onMouseDown={(e) => {
              if (submitting || !plannerOnline || !query.trim()) return
              e.currentTarget.style.transform = 'translate(4px,4px)'
              e.currentTarget.style.boxShadow = '2px 2px 0 #FFD60A'
            }}
            onMouseUp={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            {submitting ? `RUNNING · ${elapsed.toFixed(1)}s` : 'DISPATCH →'}
          </button>
        </div>
      </div>

      <div style={ts.examplesRow}>
        <div style={ts.examplesLabel}>TRY:</div>
        <div style={ts.chips}>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => { if (!submitting) setQuery(ex.text) }}
              style={{
                ...ts.chip,
                background: ex.tone,
                transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (1 + (i % 3) * 0.6)}deg)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(0deg) translateY(-3px)'
                e.currentTarget.style.boxShadow = '5px 7px 0 #000'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `rotate(${(i % 2 === 0 ? -1 : 1) * (1 + (i % 3) * 0.6)}deg)`
                e.currentTarget.style.boxShadow = '3px 4px 0 #000'
              }}
            >
              {ex.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const ts: Record<string, CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },

  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: 2, color: '#777' },
  title: { fontFamily: "'Archivo Black', sans-serif", fontSize: 52, lineHeight: '0.9', letterSpacing: -2, color: '#0A0A0A' },
  statusPill: {
    display: 'inline-flex', alignItems: 'center', gap: 8, border: '3px solid #000',
    padding: '6px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
    letterSpacing: 1.5, color: '#000', boxShadow: '4px 4px 0 #000',
  },
  dot: { width: 10, height: 10, borderRadius: 999, background: '#000' },

  well: {
    background: '#fff', border: '3px solid #000', boxShadow: '6px 6px 0 #000',
    padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
  },
  textarea: {
    width: '100%', border: 'none', outline: 'none', resize: 'vertical', minHeight: 100,
    fontFamily: "'Inter', sans-serif", fontSize: 17, lineHeight: '1.4',
    background: 'transparent', color: '#0A0A0A', padding: 0,
  },
  wellFoot: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderTop: '2px dashed #000', paddingTop: 12,
  },
  charCount: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#888', letterSpacing: 1 },
  submitBtn: {
    border: '3px solid #000', background: '#0A0A0A', color: '#fff',
    fontFamily: "'Archivo Black', sans-serif", fontSize: 17, letterSpacing: 1.5, padding: '11px 22px',
    boxShadow: '6px 6px 0 #FFD60A', cursor: 'pointer', transition: 'transform 80ms, box-shadow 80ms',
  },
  submitDisabled: { opacity: 0.4, cursor: 'not-allowed', boxShadow: '6px 6px 0 #999' },

  examplesRow: { display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' },
  examplesLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#666', paddingTop: 10 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 10, flex: 1 },
  chip: {
    border: '2.5px solid #000', padding: '8px 12px', maxWidth: 220,
    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#0A0A0A', cursor: 'pointer',
    boxShadow: '3px 4px 0 #000', textAlign: 'left', transition: 'transform 120ms, box-shadow 120ms',
    lineHeight: '1.25',
  },
}
