// App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  POLL_QUESTION,
  POLL_OPTIONS,
  CONTRACT_ID,
  DEPLOY_TX,
  isFreighterInstalled,
  connectFreighter,
  fetchBalance,
  fetchPollResults,
  checkHasVoted,
  submitVote,
  shortAddress,
  calcPercentages,
} from './stellar.js'
import './App.css'

const COLORS = ['#5b8dee', '#34d399', '#fbbf24', '#f87171']
const BGHUES = [
  'rgba(91,141,238,0.10)',
  'rgba(52,211,153,0.10)',
  'rgba(251,191,36,0.10)',
  'rgba(248,113,113,0.10)',
]
const REFRESH_INTERVAL = 10000

function Spinner({ size = 16, color = '#fff' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid rgba(255,255,255,0.15)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin .65s linear infinite',
      flexShrink: 0,
    }} />
  )
}

function Skeleton({ width = '100%', height = 18, radius = 6, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%)',
      backgroundSize: '200% auto',
      animation: 'skeletonPulse 1.4s ease-in-out infinite',
      ...style,
    }} />
  )
}

function PollSkeleton() {
  return (
    <div className="skeleton-wrap fade-in">
      <Skeleton height={22} width="70%" style={{ marginBottom: 10 }} />
      <Skeleton height={14} width="40%" style={{ marginBottom: 24 }} />
      {[0,1,2,3].map(i => (
        <Skeleton key={i} height={56} radius={12} style={{ marginBottom: 10 }} />
      ))}
      <Skeleton height={48} radius={12} style={{ marginTop: 6 }} />
    </div>
  )
}

function ProgressRing({ pct, color, size = 48 }) {
  const r    = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  )
}

function WalletModal({ onClose, onConnectFreighter, loading, error }) {
  const WALLETS = [
    { id: 'freighter', name: 'Freighter',   icon: '🚀', note: 'Recommended — fully integrated', url: null },
    { id: 'xbull',    name: 'xBull Wallet', icon: '🐂', note: 'Click to install',               url: 'https://xbull.app' },
    { id: 'lobstr',   name: 'LOBSTR',       icon: '🦞', note: 'Click to install',               url: 'https://lobstr.co' },
  ]
  return (
    <div className="overlay fade-in" onClick={onClose}>
      <div className="modal pop-in" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Select Wallet</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <p className="modal-hint">
          This app runs on <b>Stellar Testnet</b>.<br />
          Make sure Freighter is switched to Testnet.
        </p>
        {error && <div className="err-box slide-down"><span>⚠</span> {error}</div>}
        <div className="wallet-grid">
          {WALLETS.map(w => (
            <button
              key={w.id}
              className={`wallet-row ${w.id === 'freighter' ? 'wallet-main' : 'wallet-alt'}`}
              disabled={loading && w.id === 'freighter'}
              onClick={() => { if (w.url) window.open(w.url, '_blank'); else onConnectFreighter() }}
            >
              <span className="wallet-icon">{w.icon}</span>
              <div className="wallet-text">
                <span className="wallet-name">{w.name}</span>
                <span className="wallet-note">{w.note}</span>
              </div>
              {w.id === 'freighter' && loading ? <Spinner size={15} /> : <span className="wallet-chevron">→</span>}
            </button>
          ))}
        </div>
        <p className="modal-note">
          Need testnet XLM?{' '}
          <a href="https://laboratory.stellar.org/#account-creator?network=test" target="_blank" rel="noreferrer" className="modal-link">
            Use Friendbot ↗
          </a>
        </p>
      </div>
    </div>
  )
}

function OptionRow({ idx, label, votes, total, chosen, onChoose, locked, animDelay }) {
  const pct      = total > 0 ? Math.round((votes / total) * 100) : 0
  const color    = COLORS[idx]
  const isChosen = chosen === idx

  return (
    <button
      className={`option-row ${isChosen ? 'option-chosen' : ''} ${locked ? 'option-locked' : ''}`}
      style={{
        '--c': color, '--bg': BGHUES[idx],
        borderColor: isChosen ? color : undefined,
        animationDelay: `${animDelay}s`,
      }}
      onClick={() => !locked && onChoose(idx)}
      disabled={locked}
    >
      <div className="option-main">
        <div className="option-left">
          <span className="option-radio" style={{ borderColor: color, background: isChosen ? color : 'transparent' }}>
            {isChosen && <span style={{ color: '#060610', fontSize: 10, fontWeight: 900 }}>✓</span>}
          </span>
          <span className="option-label">{label}</span>
        </div>
        <div className="option-right">
          {locked && (
            <>
              <ProgressRing pct={pct} color={color} size={40} />
              <div className="option-stats">
                <span className="option-pct" style={{ color }}>{pct}%</span>
                <span className="option-count">{votes} vote{votes !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </div>
      </div>
      {locked && (
        <div className="option-bar-track">
          <div className="option-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
    </button>
  )
}

function TxBanner({ status, hash, errMsg, onDismiss }) {
  if (!status) return null
  const MAP = {
    pending:      { color: 'var(--accent)',  bg: 'var(--accent-dim)',  icon: <Spinner size={16} color="var(--accent)" />, text: 'Waiting for Freighter signature…' },
    confirming:   { color: 'var(--yellow)',  bg: 'var(--yellow-dim)',  icon: <Spinner size={16} color="var(--yellow)" />, text: 'Confirming on Stellar Testnet…' },
    success:      { color: 'var(--green)',   bg: 'var(--green-dim)',   icon: '✓', text: 'Vote recorded on-chain!' },
    no_wallet:    { color: 'var(--yellow)',  bg: 'var(--yellow-dim)',  icon: '⚠', text: 'Wallet not found — install Freighter first.' },
    insufficient: { color: 'var(--red)',     bg: 'var(--red-dim)',     icon: '⚠', text: 'Insufficient XLM. Fund your wallet at Friendbot.' },
    rejected:     { color: 'var(--red)',     bg: 'var(--red-dim)',     icon: '✕', text: 'Transaction rejected by user.' },
    already_voted:{ color: 'var(--yellow)',  bg: 'var(--yellow-dim)',  icon: '⚑', text: 'Already voted — each wallet can vote once.' },
    error:        { color: 'var(--red)',     bg: 'var(--red-dim)',     icon: '✕', text: errMsg || 'Transaction failed.' },
  }
  const c = MAP[status] || MAP.error
  const canDismiss = !['pending','confirming'].includes(status)
  return (
    <div className="tx-banner pop-in" style={{ background: c.bg, borderColor: c.color }}>
      <span className="tx-banner-icon" style={{ color: c.color }}>{c.icon}</span>
      <div className="tx-banner-body">
        <span style={{ color: c.color, fontWeight: 700, fontSize: '0.88rem' }}>{c.text}</span>
        {status === 'success' && hash && (
          <a className="tx-link" href={`https://stellar.expert/explorer/testnet/tx/${hash}`} target="_blank" rel="noreferrer">
            View TX on Explorer ↗
          </a>
        )}
      </div>
      {canDismiss && <button className="icon-btn" onClick={onDismiss} style={{ marginLeft: 'auto' }}>✕</button>}
    </div>
  )
}

function RefreshBar({ active, duration }) {
  return (
    <div className="refresh-track">
      {active && <div className="refresh-bar" style={{ '--dur': `${duration}ms` }} />}
    </div>
  )
}

function ActivityLog({ items }) {
  return (
    <div className="activity">
      <div className="section-label"><span className="live-pip" /> Live Activity</div>
      {!items.length
        ? <div className="empty-activity">No activity yet. Connect your wallet to vote!</div>
        : items.map((it, i) => (
          <div key={i} className="activity-row slide-down" style={{ animationDelay: `${i * 0.04}s` }}>
            <span className="activity-icon">{it.icon}</span>
            <span className="activity-msg">{it.msg}</span>
            <span className="activity-time">{it.time}</span>
          </div>
        ))
      }
    </div>
  )
}

export default function App() {
  const [address, setAddress]         = useState(null)
  const [balance, setBalance]         = useState('—')
  const [showModal, setShowModal]     = useState(false)
  const [connectErr, setConnectErr]   = useState('')
  const [connecting, setConnecting]   = useState(false)

  const [results, setResults]         = useState({ votes: [0,0,0,0], total: 0 })
  const [pollLoading, setPollLoading] = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [hasVoted, setHasVoted]       = useState(false)
  const [chosen, setChosen]           = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const [txStatus, setTxStatus]       = useState(null)
  const [txHash, setTxHash]           = useState(null)
  const [txErrMsg, setTxErrMsg]       = useState('')
  const [submitting, setSubmitting]   = useState(false)

  const [log, setLog] = useState([])
  const timer = useRef(null)

  function addLog(icon, msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setLog(prev => [{ icon, msg, time }, ...prev].slice(0, 6))
  }

  const loadPoll = useCallback(async (isInitial = false) => {
    if (!isInitial) setRefreshing(true)
    try {
      const data = await fetchPollResults(true) // always force refresh
      setResults(data)
      setLastUpdated(new Date())
    } catch { /* silent */ } finally {
      if (isInitial) setPollLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadPoll(true)
    timer.current = setInterval(() => loadPoll(false), REFRESH_INTERVAL)
    return () => clearInterval(timer.current)
  }, [loadPoll])

  useEffect(() => {
    if (!address) return
    checkHasVoted(address).then(v => { if (v) setHasVoted(true) })
  }, [address])

  async function handleConnect() {
    setConnectErr('')
    setConnecting(true)
    try {
      const installed = await isFreighterInstalled()
      if (!installed) throw Object.assign(new Error(), { code: 'no_wallet' })
      const addr = await connectFreighter()
      setAddress(addr)
      const bal = await fetchBalance(addr).catch(() => '—')
      setBalance(bal)
      setShowModal(false)
      addLog('🔗', `Connected: ${shortAddress(addr)}`)
    } catch (err) {
      if (err.code === 'no_wallet') setConnectErr('Freighter not found. Install it from freighter.app')
      else setConnectErr(err.message || 'Connection failed.')
    } finally {
      setConnecting(false)
    }
  }

  function handleDisconnect() {
    setAddress(null); setBalance('—'); setHasVoted(false)
    setChosen(null); setTxStatus(null)
    addLog('🔌', 'Wallet disconnected')
  }

  async function handleVote() {
    if (!address)        { setTxStatus('no_wallet');    return }
    if (chosen === null)   return
    if (hasVoted)        { setTxStatus('already_voted'); return }
    const bal = parseFloat(balance)
    if (!isNaN(bal) && bal < 1) { setTxStatus('insufficient'); return }

    setSubmitting(true)
    setTxStatus('pending')
    setTxHash(null)
    setTxErrMsg('')

    try {
      setTxStatus('confirming')
      const hash = await submitVote(address, chosen)
      setTxHash(hash)
      setTxStatus('success')
      setHasVoted(true)
      addLog('🗳️', `Voted: "${POLL_OPTIONS[chosen]}"`)

      // ── Immediately update local vote count so percentages show right away ──
      setResults(prev => {
        const newVotes = [...prev.votes]
        newVotes[chosen] = (newVotes[chosen] || 0) + 1
        const newTotal = prev.total + 1
        return { votes: newVotes, total: newTotal }
      })

      // Then fetch fresh data from chain after a delay
      setTimeout(() => loadPoll(false), 4000)
      setTimeout(() => loadPoll(false), 10000)

      fetchBalance(address).then(setBalance).catch(() => {})
    } catch (err) {
      const msg = (err.message || '').toLowerCase()
      setTxErrMsg(err.message || 'Transaction failed.')
      if (msg.includes('already voted'))                                          { setTxStatus('already_voted'); setHasVoted(true) }
      else if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancel')) setTxStatus('rejected')
      else if (msg.includes('insufficient'))                                        setTxStatus('insufficient')
      else                                                                          setTxStatus('error')
      addLog('❌', `Error: ${err.message?.slice(0, 40)}`)
    } finally {
      setSubmitting(false)
    }
  }

  const leadIdx = results.total > 0
    ? results.votes.reduce((best, v, i) => v > results.votes[best] ? i : best, 0)
    : null

  const pcts = calcPercentages(results.votes, results.total)

  return (
    <div className="app">
      <div className="bg-dots" aria-hidden />

      <header className="header">
        <div className="logo">
          <span className="logo-diamond">◈</span>
          StellarPoll
          <span className="logo-badge">v2</span>
        </div>
        <div className="header-r">
          <span className="net-chip">🧪 Testnet</span>
          {address ? (
            <div className="wallet-pill">
              <span className="pip pip-green" />
              <span className="pill-addr">{shortAddress(address)}</span>
              <span className="pill-bal">{balance} XLM</span>
              <button className="pill-disc" onClick={handleDisconnect} title="Disconnect">✕</button>
            </div>
          ) : (
            <button className="btn-connect" onClick={() => { setConnectErr(''); setShowModal(true) }}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <RefreshBar active={refreshing} duration={REFRESH_INTERVAL} />

      <main className="main">
        <div className="col-left">

          <div className="contract-badge fade-up">
            <span className="badge-dot" />
            <span className="badge-label">Contract</span>
            <span className="badge-addr">{CONTRACT_ID.slice(0,8)}…{CONTRACT_ID.slice(-6)}</span>
            <a className="badge-link" href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer">
              View ↗
            </a>
          </div>

          <div className="question-card fade-up">
            <div className="q-eyebrow">
              <span className="live-pip" /> Live Poll
              {lastUpdated && (
                <span className="q-updated">
                  Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
            <h1 className="q-text">{POLL_QUESTION}</h1>
            <div className="q-total">
              {pollLoading
                ? <Skeleton width={120} height={14} />
                : <><b style={{ color: 'var(--accent)', fontSize: '1.05rem' }}>{results.total}</b> total votes cast</>
              }
            </div>
          </div>

          {pollLoading ? <PollSkeleton /> : (
            <div className="options fade-up">
              {POLL_OPTIONS.map((label, i) => (
                <OptionRow
                  key={i} idx={i} label={label}
                  votes={results.votes[i] || 0}
                  total={results.total}
                  chosen={chosen} onChoose={setChosen}
                  locked={hasVoted || submitting}
                  animDelay={0.05 * i}
                />
              ))}
            </div>
          )}

          {!pollLoading && !hasVoted && (
            <div className="vote-row fade-up">
              {!address ? (
                <button className="btn-vote btn-outline" onClick={() => { setConnectErr(''); setShowModal(true) }}>
                  Connect Wallet to Vote
                </button>
              ) : (
                <button className="btn-vote btn-solid" onClick={handleVote} disabled={chosen === null || submitting}>
                  {submitting
                    ? <><Spinner size={16} /> Submitting…</>
                    : chosen !== null
                    ? `Vote for "${POLL_OPTIONS[chosen]}"`
                    : 'Select an option above'
                  }
                </button>
              )}
            </div>
          )}

          {hasVoted && (
            <div className="voted-chip pop-in">
              <span>✓</span> Your vote is permanently recorded on Stellar Testnet
            </div>
          )}

          <TxBanner status={txStatus} hash={txHash} errMsg={txErrMsg} onDismiss={() => setTxStatus(null)} />
        </div>

        <div className="col-right">

          <div className="card fade-up">
            <div className="section-label">📊 Poll Stats</div>
            <div className="stats-grid">
              {[
                { v: pollLoading ? null : results.total, label: 'Total Votes' },
                { v: POLL_OPTIONS.length,                 label: 'Options' },
                { v: hasVoted ? '✓' : address ? '—' : '?', label: 'Your Vote', color: hasVoted ? 'var(--green)' : undefined },
                { v: 'LIVE', label: 'Updates', color: 'var(--accent)', small: true },
              ].map((s, i) => (
                <div key={i} className="stat-box">
                  {s.v === null
                    ? <Skeleton height={32} width="60%" style={{ margin: '0 auto' }} />
                    : <div className="stat-val" style={{ color: s.color, fontSize: s.small ? '0.72rem' : undefined }}>{s.v}</div>
                  }
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {!pollLoading && results.total > 0 && (
            <div className="card fade-up">
              <div className="section-label">🏆 Results Breakdown</div>
              {POLL_OPTIONS.map((opt, i) => (
                <div key={i} className="breakdown-row">
                  <div className="breakdown-top">
                    <span className="breakdown-label" style={{ color: i === leadIdx ? COLORS[i] : undefined }}>
                      {i === leadIdx && '👑 '}{opt}
                    </span>
                    <span className="breakdown-pct" style={{ color: COLORS[i] }}>{pcts[i]}%</span>
                  </div>
                  <div className="breakdown-track">
                    <div className="breakdown-fill" style={{ width: `${pcts[i]}%`, background: COLORS[i] }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <ActivityLog items={log} />

          <div className="card fade-up">
            <div className="section-label">ℹ️ How It Works</div>
            {[
              ['🔗', 'Connect Freighter (set to Testnet)'],
              ['🗳️', 'Pick your answer'],
              ['✍️', 'Submit — signed on Soroban contract'],
              ['📡', 'Results refresh live every 10s'],
              ['🔒', 'One vote per wallet, forever on-chain'],
            ].map(([icon, text], i) => (
              <div key={i} className="how-row">
                <span className="how-icon">{icon}</span>
                <span className="how-text">{text}</span>
              </div>
            ))}
          </div>

          <div className="card fade-up">
            <div className="section-label">🚀 Deployment Info</div>
            <div className="deploy-row">
              <span className="deploy-label">Contract</span>
              <a className="deploy-link" href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer">
                {CONTRACT_ID.slice(0,10)}… ↗
              </a>
            </div>
            <div className="deploy-row">
              <span className="deploy-label">Deploy TX</span>
              <a className="deploy-link" href={`https://stellar.expert/explorer/testnet/tx/${DEPLOY_TX}`} target="_blank" rel="noreferrer">
                {DEPLOY_TX.slice(0,10)}… ↗
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        StellarPoll · Orange Belt · Stellar Journey to Mastery · Testnet Only
      </footer>

      {showModal && (
        <WalletModal
          onClose={() => { setShowModal(false); setConnectErr('') }}
          onConnectFreighter={handleConnect}
          loading={connecting}
          error={connectErr}
        />
      )}
    </div>
  )
}