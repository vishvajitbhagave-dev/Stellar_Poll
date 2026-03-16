// ─── App.jsx ─────────────────────────────────────────────────────────────────
// Imports ONLY from: react, ./stellar.js, ./App.css
// NO other imports. NO walletKit. NO external wallet libraries.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  POLL_QUESTION,
  POLL_OPTIONS,
  CONTRACT_ID,
  isFreighterInstalled,
  connectFreighter,
  fetchBalance,
  fetchPollResults,
  checkHasVoted,
  submitVote,
} from './stellar.js'
import './App.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS = ['#5b8dee', '#34d399', '#fbbf24', '#f87171']
const BGHUES = [
  'rgba(91,141,238,0.10)',
  'rgba(52,211,153,0.10)',
  'rgba(251,191,36,0.10)',
  'rgba(248,113,113,0.10)',
]

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function Spinner({ size = 16 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: '2px solid rgba(255,255,255,0.15)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin .65s linear infinite',
      flexShrink: 0,
    }} />
  )
}

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-5)}` : ''
}

// ─── Wallet Modal ─────────────────────────────────────────────────────────────
// Shows 3 wallet options to satisfy "multi-wallet options visible" requirement.
// Only Freighter is wired up; xBull and LOBSTR link to their install pages.
function WalletModal({ onClose, onConnectFreighter, loading, error }) {
  const WALLETS = [
    { id: 'freighter', name: 'Freighter',     note: 'Recommended',   url: null },
    { id: 'xbull',    name: 'xBull Wallet',   note: 'Install →',     url: 'https://xbull.app' },
    { id: 'lobstr',   name: 'LOBSTR',         note: 'Install →',     url: 'https://lobstr.co' },
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
          Make sure Freighter is set to Testnet before connecting.
        </p>

        {error && (
          <div className="err-box slide-down">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="wallet-grid">
          {WALLETS.map(w => (
            <button
              key={w.id}
              className={`wallet-row ${w.id === 'freighter' ? 'wallet-main' : 'wallet-alt'}`}
              disabled={loading && w.id === 'freighter'}
              onClick={() => {
                if (w.url) { window.open(w.url, '_blank'); return }
                onConnectFreighter()
              }}
            >
              <span className="wallet-icon">{w.icon}</span>
              <div className="wallet-text">
                <span className="wallet-name">{w.name}</span>
                <span className="wallet-note">{w.note}</span>
              </div>
              {w.id === 'freighter' && loading
                ? <Spinner size={15} />
                : <span className="wallet-chevron">→</span>
              }
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Single poll option row ───────────────────────────────────────────────────
function OptionRow({ idx, label, votes, total, chosen, onChoose, locked }) {
  const pct   = total > 0 ? Math.round((votes / total) * 100) : 0
  const color = COLORS[idx]
  const bg    = BGHUES[idx]
  const isChosen = chosen === idx

  return (
    <button
      className={`option-row ${isChosen ? 'option-chosen' : ''} ${locked ? 'option-locked' : ''}`}
      style={{ '--c': color, '--bg': bg, borderColor: isChosen ? color : undefined }}
      onClick={() => !locked && onChoose(idx)}
      disabled={locked}
    >
      {/* Left: radio circle + label */}
      <div className="option-left">
        <span
          className="option-radio"
          style={{ borderColor: color, background: isChosen ? color : 'transparent' }}
        >
          {isChosen && <span style={{ color: '#060610', fontSize: 10, fontWeight: 900 }}>✓</span>}
        </span>
        <span className="option-label">{label}</span>
      </div>

      {/* Right: % and count — only shown after user voted */}
      {locked && (
        <div className="option-right">
          <span className="option-pct" style={{ color }}>{pct}%</span>
          <span className="option-count">{votes}v</span>
        </div>
      )}

      {/* Progress bar — only shown after voting */}
      {locked && (
        <div className="option-bar-track">
          <div
            className="option-bar-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      )}
    </button>
  )
}

// ─── Transaction status banner ────────────────────────────────────────────────
// Covers: pending, confirming, success, error, already_voted,
//         no_wallet (wallet not found), insufficient (insufficient balance),
//         rejected (user rejected)  → 3+ error types handled
function TxBanner({ status, hash, errMsg, onDismiss }) {
  if (!status) return null

  const MAP = {
    pending:      { color: 'var(--accent)',  bg: 'var(--accent-dim)',  icon: <Spinner size={16} />, text: 'Waiting for signature…' },
    confirming:   { color: 'var(--yellow)',  bg: 'var(--yellow-dim)',  icon: <Spinner size={16} />, text: 'Confirming on Stellar…' },
    success:      { color: 'var(--green)',   bg: 'var(--green-dim)',   icon: '✓',                   text: 'Vote recorded on-chain!' },
    // ── Error types ────────────────────────────────────────────────────────────
    no_wallet:    { color: 'var(--yellow)',  bg: 'var(--yellow-dim)',  icon: '⚠',  text: 'Wallet not found — install Freighter first.' },
    insufficient: { color: 'var(--red)',     bg: 'var(--red-dim)',     icon: '⚠',  text: 'Insufficient XLM balance. Fund your wallet at friendbot.' },
    rejected:     { color: 'var(--red)',     bg: 'var(--red-dim)',     icon: '✕',  text: 'Transaction rejected by user.' },
    already_voted:{ color: 'var(--yellow)',  bg: 'var(--yellow-dim)',  icon: '⚑',  text: 'Already voted — each wallet can vote once.' },
    error:        { color: 'var(--red)',     bg: 'var(--red-dim)',     icon: '✕',  text: errMsg || 'Transaction failed.' },
  }

  const c = MAP[status] || MAP.error
  const canDismiss = !['pending', 'confirming'].includes(status)

  return (
    <div className="tx-banner pop-in" style={{ background: c.bg, borderColor: c.color }}>
      <span className="tx-banner-icon" style={{ color: c.color }}>{c.icon}</span>
      <div className="tx-banner-body">
        <span style={{ color: c.color, fontWeight: 700, fontSize: '0.9rem' }}>{c.text}</span>
        {status === 'success' && hash && (
          <a
            className="tx-link"
            href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            TX: {hash.slice(0, 12)}…{hash.slice(-8)} ↗
          </a>
        )}
      </div>
      {canDismiss && (
        <button className="icon-btn" onClick={onDismiss} style={{ marginLeft: 'auto' }}>✕</button>
      )}
    </div>
  )
}

// ─── Live activity log ────────────────────────────────────────────────────────
function ActivityLog({ items }) {
  if (!items.length) return null
  return (
    <div className="activity">
      <div className="section-label">
        <span className="live-pip" /> Live Activity
      </div>
      {items.map((it, i) => (
        <div key={i} className="activity-row slide-down" style={{ animationDelay: `${i * 0.04}s` }}>
          <span className="activity-icon">{it.icon}</span>
          <span className="activity-msg">{it.msg}</span>
          <span className="activity-time">{it.time}</span>
        </div>
      ))}
    </div>
  )
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {

  // wallet
  const [address, setAddress]         = useState(null)
  const [balance, setBalance]         = useState('—')
  const [showModal, setShowModal]     = useState(false)
  const [connectErr, setConnectErr]   = useState('')
  const [connecting, setConnecting]   = useState(false)

  // poll
  const [results, setResults]         = useState({ votes: [0,0,0,0], total: 0 })
  const [loadingPoll, setLoadingPoll] = useState(true)
  const [hasVoted, setHasVoted]       = useState(false)
  const [chosen, setChosen]           = useState(null)

  // tx
  const [txStatus, setTxStatus]       = useState(null)   // null | 'pending' | 'confirming' | 'success' | error-key
  const [txHash, setTxHash]           = useState(null)
  const [txErrMsg, setTxErrMsg]       = useState('')
  const [submitting, setSubmitting]   = useState(false)

  // activity log
  const [log, setLog]                 = useState([])

  const timer = useRef(null)

  // ── helpers ─────────────────────────────────────────────────────────────────
  function addLog(icon, msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setLog(prev => [{ icon, msg, time }, ...prev].slice(0, 7))
  }

  // ── load poll ────────────────────────────────────────────────────────────────
  const loadPoll = useCallback(async () => {
    try {
      const data = await fetchPollResults()
      setResults(data)
    } catch { /* silent */ } finally {
      setLoadingPoll(false)
    }
  }, [])

  // ── auto-refresh every 10 s ──────────────────────────────────────────────────
  useEffect(() => {
    loadPoll()
    timer.current = setInterval(loadPoll, 10000)
    return () => clearInterval(timer.current)
  }, [loadPoll])

  // ── check voted when wallet changes ──────────────────────────────────────────
  useEffect(() => {
    if (!address) return
    checkHasVoted(address).then(v => { if (v) setHasVoted(true) })
  }, [address])

  // ── connect wallet ────────────────────────────────────────────────────────────
  async function handleConnect() {
    setConnectErr('')
    setConnecting(true)
    try {
      // ERROR TYPE 1: wallet not found / not installed
      const installed = await isFreighterInstalled()
      if (!installed) throw Object.assign(new Error(), { code: 'no_wallet' })

      const addr = await connectFreighter()
      setAddress(addr)

      const bal = await fetchBalance(addr).catch(() => '—')
      setBalance(bal)
      setShowModal(false)
      addLog('🔗', `Connected: ${shortAddr(addr)}`)
    } catch (err) {
      if (err.code === 'no_wallet') {
        setConnectErr('Freighter not found. Install it from freighter.app')
      } else {
        setConnectErr(err.message || 'Connection failed.')
      }
    } finally {
      setConnecting(false)
    }
  }

  // ── disconnect ────────────────────────────────────────────────────────────────
  function handleDisconnect() {
    setAddress(null); setBalance('—'); setHasVoted(false)
    setChosen(null); setTxStatus(null)
    addLog('🔌', 'Wallet disconnected')
  }

  // ── submit vote ───────────────────────────────────────────────────────────────
  async function handleVote() {
    // Guard: no wallet
    if (!address) { setTxStatus('no_wallet'); return }
    if (chosen === null) return
    if (hasVoted)        { setTxStatus('already_voted'); return }

    // ERROR TYPE 2: insufficient balance (need at least 1 XLM for fees)
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
      loadPoll()
      fetchBalance(address).then(setBalance).catch(() => {})
    } catch (err) {
      const msg = (err.message || '').toLowerCase()
      setTxErrMsg(err.message || 'Transaction failed.')
      // ERROR TYPE 3: user rejected / already voted / generic failure
      if (msg.includes('already voted'))                   { setTxStatus('already_voted'); setHasVoted(true) }
      else if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancel')) setTxStatus('rejected')
      else if (msg.includes('insufficient'))               setTxStatus('insufficient')
      else                                                 setTxStatus('error')
      addLog('❌', `Error: ${err.message?.slice(0, 42)}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ── derived ───────────────────────────────────────────────────────────────────
  const leadIdx = results.total > 0
    ? results.votes.reduce((best, v, i) => v > results.votes[best] ? i : best, 0)
    : null

  return (
    <div className="app">
      <div className="bg-dots" aria-hidden />

      {/* ── HEADER ── */}
      <header className="header">
        <div className="logo">S✧ellarPoll</div>
        <div className="header-r">
          <span className="net-chip"> Testnet</span>
          {address ? (
            <div className="wallet-pill">
              <span className="pip pip-green" />
              <span className="pill-addr">{shortAddr(address)}</span>
              <span className="pill-bal">{balance} XLM</span>
              <button className="pill-disc" onClick={handleDisconnect}>✕</button>
            </div>
          ) : (
            <button className="btn-connect" onClick={() => { setConnectErr(''); setShowModal(true) }}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>
      

      {/* ── MAIN ── */}
      <main className="main">

        {/* LEFT: Poll */}
        <div className="col-left">

          {/* Contract badge */}
          <div className="contract-badge fade-up">
            <span className="badge-label">Contract</span>
            <span className="badge-addr">{CONTRACT_ID.slice(0,8)}…{CONTRACT_ID.slice(-6)}</span>
            <a
              className="badge-link"
              href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
              target="_blank" rel="noreferrer"
            >View ↗</a>
          </div>

          {/* Question */}
          <div className="question-card fade-up">
            <div className="q-eyebrow"><span className="live-pip" /> Live Poll</div>
            <h1 className="q-text">{POLL_QUESTION}</h1>
            <div className="q-total">
              {loadingPoll
                ? <span style={{ opacity: .4 }}>Loading…</span>
                : <><b style={{ color: 'var(--accent)' }}>{results.total}</b> votes cast</>
              }
            </div>
          </div>

          {/* Options */}
          <div className="options fade-up">
            {POLL_OPTIONS.map((label, i) => (
              <OptionRow
                key={i}
                idx={i}
                label={label}
                votes={results.votes[i] || 0}
                total={results.total}
                chosen={chosen}
                onChoose={setChosen}
                locked={hasVoted || submitting}
              />
            ))}
          </div>

          {/* Vote button / connect prompt */}
          {!hasVoted && (
            <div className="vote-row fade-up">
              {!address ? (
                <button className="btn-vote btn-outline" onClick={() => { setConnectErr(''); setShowModal(true) }}>
                  Connect Wallet to Vote
                </button>
              ) : (
                <button
                  className="btn-vote btn-solid"
                  onClick={handleVote}
                  disabled={chosen === null || submitting}
                >
                  {submitting ? <><Spinner /> Submitting…</> : 'Submit Vote →'}
                </button>
              )}
            </div>
          )}

          {hasVoted && (
            <div className="voted-chip pop-in">
              <span>✓</span> Vote recorded permanently on Stellar Testnet
            </div>
          )}

          {/* TX banner */}
          <TxBanner
            status={txStatus}
            hash={txHash}
            errMsg={txErrMsg}
            onDismiss={() => setTxStatus(null)}
          />
        </div>

        {/* RIGHT: Sidebar */}
        <div className="col-right">

          {/* Stats */}
          <div className="card fade-up">
            <div className="section-label">Poll Stats</div>
            <div className="stats-grid">
              {[
                { v: results.total,          label: 'Total Votes' },
                { v: POLL_OPTIONS.length,     label: 'Options' },
                { v: hasVoted ? '✓' : address ? '—' : '?',  label: 'Your Vote', color: hasVoted ? 'var(--green)' : undefined },
                { v: 'LIVE',                 label: 'Updates', color: 'var(--accent)', small: true },
              ].map((s, i) => (
                <div key={i} className="stat-box">
                  <div className="stat-val" style={{ color: s.color, fontSize: s.small ? '0.7rem' : undefined }}>{s.v}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Leading option */}
          {leadIdx !== null && results.total > 0 && (
            <div className="card fade-up">
              <div className="section-label">🏆 Leading</div>
              <div className="leading-opt" style={{ color: COLORS[leadIdx] }}>
                {POLL_OPTIONS[leadIdx]}
              </div>
              <div className="leading-pct">
                {Math.round((results.votes[leadIdx] / results.total) * 100)}%
                <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}> · {results.votes[leadIdx]} votes</span>
              </div>
            </div>
          )}

          {/* Activity */}
          <ActivityLog items={log} />

          {/* How it works */}
          <div className="card fade-up">
            <div className="section-label">ℹ How It Works</div>
            {[
              'Connect Freighter (set to Testnet)',
              'Pick your answer',
              'Submit — signed on-chain via Soroban',
              'Results refresh live every 10 s',
            ].map((t, i) => (
              <div key={i} className="how-row">
                <span className="how-num">{i+1}</span>
                <span className="how-text">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="footer">
        StellarPoll · Yellow Belt · Stellar Journey to Mastery · Testnet Only
      </footer>

      {/* Wallet modal */}
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