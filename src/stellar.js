// stellar.js
import * as StellarSdk from '@stellar/stellar-sdk'

export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET
export const HORIZON_URL        = 'https://horizon-testnet.stellar.org'
export const RPC_URL            = 'https://soroban-testnet.stellar.org'
export const CONTRACT_ID        = 'CDSVXG7VBBP2IASOP4V4ARRZNVPI2VHX5ARJEY7ZZD6K2WCGFAC54S4V'

export const POLL_QUESTION = 'What matters most in a blockchain platform?'
export const POLL_OPTIONS  = [
  'Speed and Low Fees',
  'True Decentralization',
  'Developer Experience',
  'Real World Adoption',
]

export const DEPLOY_TX = '41fc8025e30c4a788b2deac516a60cfa761976b185d7b6b61d6c93e5e6043b7d'
export const INIT_TX   = '2eaba20d07fab964a757d9b5c957fede094d7009eaa456e4317d537759f41680'

// SDK instances
function createHorizonServer() {
  if (StellarSdk.Horizon?.Server) return new StellarSdk.Horizon.Server(HORIZON_URL)
  if (StellarSdk.Server)          return new StellarSdk.Server(HORIZON_URL)
  throw new Error('Horizon Server not found')
}
function createRpcServer() {
  if (StellarSdk.SorobanRpc?.Server) return new StellarSdk.SorobanRpc.Server(RPC_URL)
  if (StellarSdk.rpc?.Server)        return new StellarSdk.rpc.Server(RPC_URL)
  throw new Error('RPC Server not found')
}
export const horizon = createHorizonServer()
export const rpc     = createRpcServer()

// Cache
const CACHE_TTL = 8000
const cache = {
  results: null, timestamp: 0, hasVoted: {},
  isValid()         { return this.results !== null && (Date.now() - this.timestamp) < CACHE_TTL },
  setResults(data)  { this.results = data; this.timestamp = Date.now() },
  invalidate()      { this.results = null; this.timestamp = 0 },
  setHasVoted(a, v) { this.hasVoted[a] = v },
  getHasVoted(a)    { return this.hasVoted[a] ?? null },
}
export { cache }

// Utilities
export function isValidStellarAddress(address) {
  if (!address || typeof address !== 'string') return false
  if (!address.startsWith('G'))                return false
  if (address.length !== 56)                   return false
  return /^[A-Z2-7]+$/.test(address)
}
export function formatBalance(balance) {
  const num = parseFloat(balance)
  return isNaN(num) ? '0.0000' : num.toFixed(4)
}
export function shortAddress(address) {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}…${address.slice(-5)}`
}
export function calcPercentages(votes, total) {
  if (!total || total === 0) return votes.map(() => 0)
  return votes.map(v => Math.round((v / total) * 100))
}

// Wallet
export async function isFreighterInstalled() {
  try {
    const f = await import('@stellar/freighter-api')
    if (!f.isConnected) return false
    const r = await f.isConnected()
    return r === true || r?.isConnected === true
  } catch { return false }
}
export async function connectFreighter() {
  const f = await import('@stellar/freighter-api')
  if (typeof f.requestAccess === 'function') {
    try {
      const r = await f.requestAccess()
      if (r?.address)   return r.address
      if (r?.publicKey) return r.publicKey
    } catch {}
  }
  if (typeof f.getAddress === 'function') {
    try { const r = await f.getAddress(); if (r?.address) return r.address } catch {}
  }
  if (typeof f.getPublicKey === 'function') {
    const r = await f.getPublicKey()
    if (typeof r === 'string' && r.length > 0) return r
    if (r?.publicKey) return r.publicKey
  }
  throw new Error('Cannot get address from Freighter. Make sure it is unlocked and on Testnet.')
}
export async function signWithFreighter(xdr) {
  const f = await import('@stellar/freighter-api')
  if (typeof f.signTransaction !== 'function') throw new Error('signTransaction not available.')
  const r = await f.signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE })
  if (typeof r === 'string') return r
  if (r?.signedTxXdr)        return r.signedTxXdr
  throw new Error('Freighter did not return a signed transaction.')
}

// Balance
export async function fetchBalance(publicKey) {
  try {
    const account = await horizon.loadAccount(publicKey)
    const native  = account.balances.find(b => b.asset_type === 'native')
    return formatBalance(native?.balance || '0')
  } catch { return '0.0000' }
}

// ─── FETCH POLL RESULTS via direct JSON-RPC call ──────────────────────────────
// We call the Soroban RPC endpoint directly using fetch().
// This bypasses the SDK completely and avoids all "Bad union switch" errors.

async function callRpcMethod(method, params) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  })
  const data = await response.json()
  if (data.error) throw new Error(data.error.message || 'RPC error')
  return data.result
}

// Build a base64 XDR transaction for simulating a contract call
async function buildTxXdr(fnName, args = []) {
  const contract = new StellarSdk.Contract(CONTRACT_ID)
  const account  = await rpc.getAccount('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN')

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(fnName, ...args))
    .setTimeout(30)
    .build()

  return tx.toXDR()
}

// Simulate via raw JSON-RPC and extract u32 from result XDR
async function simulateAndReadU32(fnName, args = []) {
  try {
    const txXdr = await buildTxXdr(fnName, args)
    const result = await callRpcMethod('simulateTransaction', { transaction: txXdr })

    // result.results[0].xdr is the return value as base64 XDR
    const retvalXdr = result?.results?.[0]?.xdr
    if (!retvalXdr) return 0

    // Parse the XDR ScVal
    const scVal = StellarSdk.xdr.ScVal.fromXDR(retvalXdr, 'base64')

    // Extract u32 value
    try { return Number(StellarSdk.scValToNative(scVal)) || 0 } catch {}
    try { return scVal.u32() } catch {}
    try { return Number(scVal._value) || 0 } catch {}
    return 0
  } catch (err) {
    console.warn(`simulateAndReadU32(${fnName}):`, err.message)
    return 0
  }
}

// Simulate and read bool
async function simulateAndReadBool(fnName, args = []) {
  try {
    const txXdr  = await buildTxXdr(fnName, args)
    const result = await callRpcMethod('simulateTransaction', { transaction: txXdr })
    const retvalXdr = result?.results?.[0]?.xdr
    if (!retvalXdr) return false
    const scVal = StellarSdk.xdr.ScVal.fromXDR(retvalXdr, 'base64')
    try { return StellarSdk.scValToNative(scVal) === true } catch {}
    try { return scVal.b() === true } catch {}
    try { return scVal._value === true } catch {}
    return false
  } catch {
    return false
  }
}

export async function fetchPollResults(forceRefresh = false) {
  if (!forceRefresh && cache.isValid()) return cache.results

  const [v0, v1, v2, v3, total] = await Promise.all([
    simulateAndReadU32('get_vote0'),
    simulateAndReadU32('get_vote1'),
    simulateAndReadU32('get_vote2'),
    simulateAndReadU32('get_vote3'),
    simulateAndReadU32('get_total'),
  ])

  const votes      = [v0, v1, v2, v3]
  const sumVotes   = votes.reduce((a, b) => a + b, 0)
  const finalTotal = total > 0 ? total : sumVotes

  const data = { votes, total: finalTotal }
  cache.setResults(data)
  return data
}

export async function checkHasVoted(voterAddress) {
  const cached = cache.getHasVoted(voterAddress)
  if (cached === true) return true
  try {
    const voterScVal = new StellarSdk.Address(voterAddress).toScVal()
    const result = await simulateAndReadBool('has_voted', [voterScVal])
    if (result) cache.setHasVoted(voterAddress, true)
    return result
  } catch { return false }
}

// Submit vote
export async function submitVote(voterAddress, optionIndex) {
  const contract   = new StellarSdk.Contract(CONTRACT_ID)
  const voterScVal = new StellarSdk.Address(voterAddress).toScVal()
  const indexScVal = StellarSdk.nativeToScVal(optionIndex, { type: 'u32' })

  let account
  try { account = await rpc.getAccount(voterAddress) }
  catch { throw new Error('Account not found on testnet. Fund it at friendbot first.') }

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '500000', networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('vote', voterScVal, indexScVal))
    .setTimeout(180)
    .build()

  const sim = await rpc.simulateTransaction(tx)
  const isSimError = StellarSdk.SorobanRpc?.Api?.isSimulationError?.(sim) ||
                     StellarSdk.rpc?.Api?.isSimulationError?.(sim) || sim.error != null

  if (isSimError) {
    const msg = (sim.error || '').toLowerCase()
    if (msg.includes('already voted'))  throw new Error('You have already voted!')
    if (msg.includes('invalid option')) throw new Error('Invalid option selected.')
    throw new Error('Contract error: ' + (sim.error || 'unknown'))
  }

  const assemble = StellarSdk.SorobanRpc?.assembleTransaction ||
                   StellarSdk.rpc?.assembleTransaction
  if (!assemble) throw new Error('assembleTransaction not found.')
  const preparedTx = assemble(tx, sim).build()

  let signedXdr
  try { signedXdr = await signWithFreighter(preparedTx.toXDR()) }
  catch (err) {
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('denied') || msg.includes('rejected') || msg.includes('cancel'))
      throw new Error('Transaction rejected by user.')
    throw new Error('Signing failed: ' + err.message)
  }

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  const sendResp = await rpc.sendTransaction(signedTx)
  if (sendResp.status === 'ERROR') throw new Error('Transaction submission failed.')

  const hash = sendResp.hash
  const TxStatus = StellarSdk.SorobanRpc?.Api?.GetTransactionStatus ||
                   StellarSdk.rpc?.Api?.GetTransactionStatus ||
                   { SUCCESS: 'SUCCESS', FAILED: 'FAILED' }

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const s = await rpc.getTransaction(hash)
    if (s.status === TxStatus.SUCCESS) {
      cache.invalidate()
      cache.setHasVoted(voterAddress, true)
      return hash
    }
    if (s.status === TxStatus.FAILED) throw new Error('Transaction failed on-chain.')
  }
  throw new Error('Confirmation timeout. Check the explorer for your transaction.')
}