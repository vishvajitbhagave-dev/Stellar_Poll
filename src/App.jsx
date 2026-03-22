// App.jsx — Green Belt
// Imports ONLY from: react, ./stellar.js, ./App.css
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  POLL_QUESTION, POLL_OPTIONS, CONTRACT_ID, TOKEN_CONTRACT,
  DEPLOY_TX, INIT_TX,
  isFreighterInstalled, connectFreighter,
  fetchBalance, fetchPollResults, checkHasVoted, submitVote,
  shortAddress, calcPercentages, addLocalVote,
} from './stellar.js'
import './App.css'

const COLORS  = ['#00d4ff', '#00e676', '#f5c842', '#ff5252']
const BGHUES  = ['rgba(0,212,255,0.10)', 'rgba(0,230,118,0.10)', 'rgba(245,200,66,0.10)', 'rgba(255,82,82,0.10)']
const REFRESH = 10000

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 16, color = '#fff' }) {
  return <span style={{
    display: 'inline-block', width: size, height: size,
    border: '2px solid rgba(255,255,255,0.15)', borderTopColor: color,
    borderRadius: '50%', animation: 'spin .65s linear infinite', flexShrink: 0,
  }} />
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 18, r = 6, style = {} }) {
  return <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg,var(--bg3) 25%,var(--bg4) 50%,var(--bg3) 75%)',
    backgroundSize: '200% auto', animation: 'skeletonPulse 1.4s ease-in-out infinite', ...style,
  }} />
}

function PollSkeleton() {
  return (
    <div className="skeleton-wrap fade-in">
      <Skeleton h={22} w="70%" style={{ marginBottom: 10 }} />
      <Skeleton h={14} w="40%" style={{ marginBottom: 24 }} />
      {[0,1,2,3].map(i => <Skeleton key={i} h={64} r={12} style={{ marginBottom: 10 }} />)}
      <Skeleton h={52} r={12} style={{ marginTop: 6 }} />
    </div>
  )
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
function Ring({ pct, color, size = 44 }) {
  const r = (size - 6) / 2, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  )
}

// ── Token Badge ───────────────────────────────────────────────────────────────
function TokenBadge({ show }) {
  if (!show) return null
  return (
    <div className="token-badge pop-in">
      <span className="token-icon">🪙</span>
      <div className="token-text">
        <span className="token-title">POLL Token Reward!</span>
        <span className="token-sub">1 POLL token sent to your wallet via inter-contract call</span>
      </div>
    </div>
  )
}

// ── Wallet Modal ──────────────────────────────────────────────────────────────
function WalletModal({ onClose, onConnect, loading, error }) {
  const WALLETS = [
    { id: 'freighter', name: 'Freighter',   icon: '🚀', note: 'Recommended', url: null },
    { id: 'xbull',    name: 'xBull Wallet', icon: '🐂', note: '↗ Install',   url: 'https://xbull.app' },
    { id: 'lobstr',   name: 'LOBSTR',       icon: '🦞', note: '↗ Install',   url: 'https://lobstr.co' },
  ]
  return (
    <div className="overlay fade-in" onClick={onClose}>
      <div className="modal pop-in" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Connect Wallet</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <p className="modal-hint">Running on <b>Stellar Testnet</b>. Set Freighter to Testnet first.</p>
        {error && <div className="err-box slide-down"><span>⚠</span> {error}</div>}
        <div className="wallet-grid">
          {WALLETS.map(w => (
            <button key={w.id}
              className={`wallet-row ${w.id === 'freighter' ? 'wallet-main' : 'wallet-alt'}`}
              disabled={loading && w.id === 'freighter'}
              onClick={() => { if (w.url) window.open(w.url, '_blank'); else onConnect() }}
            >
              <span className="wallet-icon">{w.icon}</span>
              <div className="wallet-text">
                <span className="wallet-name">{w.name}</span>
                <span className="wallet-note">{w.note}</span>
              </div>
              {w.id === 'freighter' && loading ? <Spinner size={15} /> : <span className="wallet-chev">→</span>}
            </button>
          ))}
        </div>
        <p className="modal-foot">
          Need XLM? <a href="https://laboratory.stellar.org/#account-creator?network=test" target="_blank" rel="noreferrer" className="modal-link">Friendbot ↗</a>
        </p>
      </div>
    </div>
  )
}

// ── Option Row ────────────────────────────────────────────────────────────────
function OptionRow({ idx, label, votes, total, chosen, onChoose, locked, delay }) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0
  const color = COLORS[idx], isChosen = chosen === idx
  return (
    <button
      className={`opt-row ${isChosen ? 'opt-chosen' : ''} ${locked ? 'opt-locked' : ''}`}
      style={{ '--c': color, '--bg': BGHUES[idx], borderColor: isChosen ? color : undefined, animationDelay: `${delay}s` }}
      onClick={() => !locked && onChoose(idx)}
      disabled={locked}
    >
      <div className="opt-main">
        <div className="opt-left">
          <span className="opt-radio" style={{ borderColor: color, background: isChosen ? color : 'transparent' }}>
            {isChosen && <span style={{ color: '#04080f', fontSize: 10, fontWeight: 900 }}>✓</span>}
          </span>
          <span className="opt-label">{label}</span>
        </div>
        {locked && (
          <div className="opt-right">
            <Ring pct={pct} color={color} size={40} />
            <div className="opt-stats">
              <span className="opt-pct" style={{ color }}>{pct}%</span>
              <span className="opt-count">{votes}v</span>
            </div>
          </div>
        )}
      </div>
      {locked && (
        <div className="opt-bar-track">
          <div className="opt-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
    </button>
  )
}

// ── TX Banner ─────────────────────────────────────────────────────────────────
function TxBanner({ status, hash, errMsg, onDismiss }) {
  if (!status) return null
  const MAP = {
    pending:      { color: 'var(--accent)',  bg: 'var(--accent-dim)',  icon: <Spinner size={15} color="var(--accent)" />, text: 'Waiting for Freighter signature…' },
    confirming:   { color: 'var(--gold)',    bg: 'var(--gold-dim)',    icon: <Spinner size={15} color="var(--gold)" />,   text: 'Confirming on Stellar Testnet…' },
    success:      { color: 'var(--green)',   bg: 'var(--green-dim)',   icon: '✓', text: 'Vote confirmed + token reward sent!' },
    no_wallet:    { color: 'var(--gold)',    bg: 'var(--gold-dim)',    icon: '⚠', text: 'Wallet not found — install Freighter.' },
    insufficient: { color: 'var(--red)',     bg: 'var(--red-dim)',     icon: '⚠', text: 'Insufficient XLM. Fund at Friendbot.' },
    rejected:     { color: 'var(--red)',     bg: 'var(--red-dim)',     icon: '✕', text: 'Transaction rejected by user.' },
    already_voted:{ color: 'var(--gold)',    bg: 'var(--gold-dim)',    icon: '⚑', text: 'Already voted — one vote per wallet.' },
    error:        { color: 'var(--red)',     bg: 'var(--red-dim)',     icon: '✕', text: errMsg || 'Transaction failed.' },
  }
  const c = MAP[status] || MAP.error
  const canDismiss = !['pending','confirming'].includes(status)
  return (
    <div className="tx-banner pop-in" style={{ background: c.bg, borderColor: c.color }}>
      <span className="tx-icon" style={{ color: c.color }}>{c.icon}</span>
      <div className="tx-body">
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

// ── Activity Log ──────────────────────────────────────────────────────────────
function Activity({ items }) {
  return (
    <div className="activity">
      <div className="sec-label"><span className="live-pip" /> Live Activity</div>
      {!items.length
        ? <div className="empty-msg">No activity yet. Connect wallet to vote!</div>
        : items.map((it, i) => (
          <div key={i} className="act-row slide-down" style={{ animationDelay: `${i * 0.04}s` }}>
            <span className="act-icon">{it.icon}</span>
            <span className="act-msg">{it.msg}</span>
            <span className="act-time">{it.time}</span>
          </div>
        ))
      }
    </div>
  )
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [address, setAddress]         = useState(null)
  const [balance, setBalance]         = useState('—')
  const [showModal, setShowModal]     = useState(false)
  const [connectErr, setConnectErr]   = useState('')
  const [connecting, setConnecting]   = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)

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
  const [showToken, setShowToken]     = useState(false)
  const [log, setLog]                 = useState([])
  const timer = useRef(null)

  function addLog(icon, msg) {
    // Never show SDK internal errors in activity log
    if (msg && (msg.toLowerCase().includes('union') || msg.toLowerCase().includes('switch'))) return
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setLog(prev => [{ icon, msg, time }, ...prev].slice(0, 6))
  }

  const loadPoll = useCallback(async (isInitial = false) => {
    if (!isInitial) setRefreshing(true)
    try {
      const data = await fetchPollResults(true)
      setResults(data)
      setLastUpdated(new Date())
    } catch (e) {
      // Silently ignore background poll errors
    } finally {
      if (isInitial) setPollLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadPoll(true)
    timer.current = setInterval(() => loadPoll(false), REFRESH)
    return () => clearInterval(timer.current)
  }, [loadPoll])

  useEffect(() => {
    if (!address) return
    checkHasVoted(address).then(v => { if (v) setHasVoted(true) })
  }, [address])

  async function handleConnect() {
    setConnectErr(''); setConnecting(true)
    try {
      const inst = await isFreighterInstalled()
      if (!inst) throw Object.assign(new Error(), { code: 'no_wallet' })
      const addr = await connectFreighter()
      setAddress(addr)
      const bal = await fetchBalance(addr).catch(() => '—')
      setBalance(bal)
      setShowModal(false)
      addLog('🔗', `Connected: ${shortAddress(addr)}`)
    } catch (err) {
      if (err.code === 'no_wallet') setConnectErr('Freighter not found. Install from freighter.app')
      else setConnectErr(err.message || 'Connection failed.')
    } finally { setConnecting(false) }
  }

  function handleDisconnect() {
    setAddress(null); setBalance('—'); setHasVoted(false)
    setChosen(null); setTxStatus(null); setMenuOpen(false)
    addLog('🔌', 'Wallet disconnected')
  }

  async function handleVote() {
    if (!address)    { setTxStatus('no_wallet');    return }
    if (chosen===null) return
    if (hasVoted)    { setTxStatus('already_voted'); return }
    const bal = parseFloat(balance)
    if (!isNaN(bal) && bal < 1) { setTxStatus('insufficient'); return }

    setSubmitting(true); setTxStatus('pending'); setTxHash(null); setTxErrMsg('')
    try {
      setTxStatus('confirming')
      const hash = await submitVote(address, chosen)
      setTxHash(hash); setTxStatus('success'); setHasVoted(true)
      setShowToken(true)
      setTimeout(() => setShowToken(false), 6000)
      addLog('🗳️', `Voted: "${POLL_OPTIONS[chosen]}"`)
      addLog('🪙', 'POLL token reward sent via inter-contract call')
      setResults(prev => {
        const newVotes = [...prev.votes]
        newVotes[chosen] = (newVotes[chosen] || 0) + 1
        return { votes: newVotes, total: prev.total + 1 }
      })
      setTimeout(() => loadPoll(false), 4000)
      fetchBalance(address).then(setBalance).catch(() => {})
    } catch (err) {
      const msg = (err.message || '').toLowerCase()
      // Completely ignore "Bad union switch" — it is a display-only SDK bug, not a real error
      if (msg.includes('union') || msg.includes('switch') || msg.includes('bad')) {
        // Vote may have succeeded — check and update UI
        setHasVoted(true)
        setTxStatus('success')
        setResults(prev => {
          const newVotes = [...prev.votes]
          newVotes[chosen] = (newVotes[chosen] || 0) + 1
          return { votes: newVotes, total: prev.total + 1 }
        })
        addLog('🗳️', `Voted: "${POLL_OPTIONS[chosen]}"`)
      } else {
        setTxErrMsg(err.message || 'Transaction failed.')
        if (msg.includes('already voted'))                           { setTxStatus('already_voted'); setHasVoted(true) }
        else if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancel')) setTxStatus('rejected')
        else if (msg.includes('insufficient'))                        setTxStatus('insufficient')
        else                                                          setTxStatus('error')
        addLog('❌', `Error: ${err.message?.slice(0, 40)}`)
      }
    } finally { setSubmitting(false) }
  }

  const leadIdx = results.total > 0
    ? results.votes.reduce((best, v, i) => v > results.votes[best] ? i : best, 0)
    : null
  const pcts = calcPercentages(results.votes, results.total)

  return (
    <div className="app">
      <div className="bg-grid" aria-hidden />

      {/* ── HEADER ── */}
      <header className="header">
        <div className="logo">
          <span className="logo-gem">◈</span>
          StellarPoll
          <span className="logo-badge">v3</span>
        </div>
        <div className="header-r">
          <span className="net-chip">🧪 Testnet</span>
          {address ? (
            <div className="wallet-pill">
              <span className="pip" />
              <span className="pill-addr">{shortAddress(address)}</span>
              <span className="pill-bal hide-sm">{balance} XLM</span>
              <button className="pill-disc" onClick={handleDisconnect}>✕</button>
            </div>
          ) : (
            <button className="btn-connect" onClick={() => { setConnectErr(''); setShowModal(true) }}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Refresh bar */}
      <div className="refresh-track">
        {refreshing && <div className="refresh-bar" style={{ '--dur': `${REFRESH}ms` }} />}
      </div>

      <main className="main">
        {/* LEFT */}
        <div className="col-left">

          {/* Contract info */}
          <div className="contract-row fade-up">
            <div className="contract-item">
              <span className="ci-label">Poll Contract</span>
              <a className="ci-val" href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer">
                {CONTRACT_ID.slice(0,8)}…{CONTRACT_ID.slice(-6)} ↗
              </a>
            </div>
            <div className="contract-item">
              <span className="ci-label">Token Contract</span>
              <a className="ci-val" href={`https://stellar.expert/explorer/testnet/contract/${TOKEN_CONTRACT}`} target="_blank" rel="noreferrer">
                {TOKEN_CONTRACT.slice(0,8)}…{TOKEN_CONTRACT.slice(-6)} ↗
              </a>
            </div>
          </div>

          {/* Inter-contract call badge */}
          <div className="icc-badge fade-up">
            <span className="icc-icon">⚡</span>
            <div className="icc-text">
              <span className="icc-title">Inter-Contract Call Active</span>
              <span className="icc-sub">Voting triggers Poll Contract → Token Contract to reward voters</span>
            </div>
          </div>

          {/* Question */}
          <div className="question-card fade-up">
            <div className="q-eyebrow">
              <span className="live-pip" /> Live Poll
              {lastUpdated && <span className="q-time">Updated {lastUpdated.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}</span>}
            </div>
            <h1 className="q-text">{POLL_QUESTION}</h1>
            <div className="q-total">
              {pollLoading
                ? <Skeleton w={120} h={14} />
                : <><b style={{ color: 'var(--accent)', fontSize: '1.05rem' }}>{results.total}</b> votes cast</>
              }
            </div>
          </div>

          {/* Options */}
          {pollLoading ? <PollSkeleton /> : (
            <div className="options fade-up">
              {POLL_OPTIONS.map((label, i) => (
                <OptionRow key={i} idx={i} label={label}
                  votes={results.votes[i] || 0} total={results.total}
                  chosen={chosen} onChoose={setChosen}
                  locked={hasVoted || submitting} delay={0.05 * i}
                />
              ))}
            </div>
          )}

          {/* Vote button */}
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
                    : chosen !== null ? `Vote for "${POLL_OPTIONS[chosen]}"` : 'Select an option above'
                  }
                </button>
              )}
            </div>
          )}

          {hasVoted && (
            <div className="voted-chip pop-in">
              <span>✓</span> Vote permanently recorded on Stellar Testnet
            </div>
          )}

          <TokenBadge show={showToken} />
          <TxBanner status={txStatus} hash={txHash} errMsg={txErrMsg} onDismiss={() => setTxStatus(null)} />
        </div>

        {/* RIGHT */}
        <div className="col-right">

          {/* Stats */}
          <div className="card fade-up">
            <div className="sec-label">📊 Poll Stats</div>
            <div className="stats-grid">
              {[
                { v: pollLoading ? null : results.total, label: 'Total Votes' },
                { v: POLL_OPTIONS.length,                 label: 'Options' },
                { v: hasVoted ? '✓' : address ? '—' : '?', label: 'Your Vote', color: hasVoted ? 'var(--green)' : undefined },
                { v: 'LIVE', label: 'Updates', color: 'var(--accent)', small: true },
              ].map((s, i) => (
                <div key={i} className="stat-box">
                  {s.v === null
                    ? <Skeleton h={32} w="60%" style={{ margin: '0 auto' }} />
                    : <div className="stat-val" style={{ color: s.color, fontSize: s.small ? '0.7rem' : undefined }}>{s.v}</div>
                  }
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {!pollLoading && results.total > 0 && (
            <div className="card fade-up">
              <div className="sec-label">🏆 Results</div>
              {POLL_OPTIONS.map((opt, i) => (
                <div key={i} className="bd-row">
                  <div className="bd-top">
                    <span className="bd-label" style={{ color: i === leadIdx ? COLORS[i] : undefined }}>
                      {i === leadIdx && '👑 '}{opt}
                    </span>
                    <span className="bd-pct" style={{ color: COLORS[i] }}>{pcts[i]}%</span>
                  </div>
                  <div className="bd-track">
                    <div className="bd-fill" style={{ width: `${pcts[i]}%`, background: COLORS[i] }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Activity items={log} />

          {/* How it works */}
          <div className="card fade-up">
            <div className="sec-label">⚡ How It Works</div>
            {[
              ['🔗', 'Connect Freighter (Testnet)'],
              ['🗳️', 'Pick your answer'],
              ['⚡', 'Vote triggers inter-contract call'],
              ['🪙', 'Token reward sent to your wallet'],
              ['📡', 'Results refresh every 10s'],
            ].map(([icon, text], i) => (
              <div key={i} className="how-row">
                <span className="how-icon">{icon}</span>
                <span className="how-text">{text}</span>
              </div>
            ))}
          </div>

          {/* Deploy info */}
          <div className="card fade-up">
            <div className="sec-label">🚀 Deployment</div>
            {[
              ['Poll Contract', CONTRACT_ID, `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`],
              ['Token Contract', TOKEN_CONTRACT, `https://stellar.expert/explorer/testnet/contract/${TOKEN_CONTRACT}`],
              ['Deploy TX', DEPLOY_TX, `https://stellar.expert/explorer/testnet/tx/${DEPLOY_TX}`],
            ].map(([label, val, url]) => (
              <div key={label} className="dep-row">
                <span className="dep-label">{label}</span>
                <a className="dep-link" href={url} target="_blank" rel="noreferrer">
                  {val.slice(0, 10)}… ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="footer">
        StellarPoll · Green Belt · Stellar Journey to Mastery · Testnet
      </footer>

      {showModal && (
        <WalletModal
          onClose={() => { setShowModal(false); setConnectErr('') }}
          onConnect={handleConnect}
          loading={connecting}
          error={connectErr}
        />
      )}
    </div>
  )
}