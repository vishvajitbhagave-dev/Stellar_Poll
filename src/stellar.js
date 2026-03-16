// stellar.js — All Stellar blockchain logic
import * as StellarSdk from '@stellar/stellar-sdk'

// Network config
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET
export const HORIZON_URL        = 'https://horizon-testnet.stellar.org'
export const RPC_URL            = 'https://soroban-testnet.stellar.org'

// CONTRACT ADDRESS — replace with your deployed contract address
export const CONTRACT_ID = 'CBZPFUTVLJOA2Z7EIDTBKVH6RJWWLJYO3GEAMVPA3NFDZPSWPY2BFBC7'

// Poll content
export const POLL_QUESTION = 'What matters most in a blockchain platform?'
export const POLL_OPTIONS  = [
  'Speed and Low Fees',
  'True Decentralization',
  'Developer Experience',
  'Real World Adoption',
]

// Stellar SDK server instances — handles both old and new SDK versions
function createHorizonServer() {
  if (StellarSdk.Horizon && StellarSdk.Horizon.Server) {
    return new StellarSdk.Horizon.Server(HORIZON_URL)
  }
  if (StellarSdk.Server) {
    return new StellarSdk.Server(HORIZON_URL)
  }
  throw new Error('Cannot find Horizon Server in StellarSdk')
}

function createRpcServer() {
  if (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Server) {
    return new StellarSdk.SorobanRpc.Server(RPC_URL)
  }
  if (StellarSdk.rpc && StellarSdk.rpc.Server) {
    return new StellarSdk.rpc.Server(RPC_URL)
  }
  throw new Error('Cannot find SorobanRpc Server in StellarSdk')
}

export const horizon = createHorizonServer()
export const rpc     = createRpcServer()

// Public account used only for read-only simulations
const SIM_ACCOUNT = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'

// ── Wallet helpers ────────────────────────────────────────────────────────────

export async function isFreighterInstalled() {
  try {
    const f = await import('@stellar/freighter-api')
    if (!f.isConnected) return false
    const result = await f.isConnected()
    return result === true || result?.isConnected === true
  } catch {
    return false
  }
}

export async function connectFreighter() {
  const f = await import('@stellar/freighter-api')

  if (typeof f.requestAccess === 'function') {
    try {
      const res = await f.requestAccess()
      if (res?.address)   return res.address
      if (res?.publicKey) return res.publicKey
    } catch (e) { /* fall through */ }
  }

  if (typeof f.getAddress === 'function') {
    try {
      const res = await f.getAddress()
      if (res?.address) return res.address
    } catch (e) { /* fall through */ }
  }

  if (typeof f.getPublicKey === 'function') {
    const res = await f.getPublicKey()
    if (typeof res === 'string' && res.length > 0) return res
    if (res?.publicKey) return res.publicKey
  }

  throw new Error('Cannot get address from Freighter. Make sure it is unlocked and on Testnet.')
}

export async function signWithFreighter(xdr) {
  const f = await import('@stellar/freighter-api')
  if (typeof f.signTransaction !== 'function') {
    throw new Error('signTransaction not available.')
  }
  const result = await f.signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE })
  if (typeof result === 'string')  return result
  if (result?.signedTxXdr)         return result.signedTxXdr
  throw new Error('Freighter did not return a signed transaction.')
}

// ── Balance ───────────────────────────────────────────────────────────────────

export async function fetchBalance(publicKey) {
  try {
    const account = await horizon.loadAccount(publicKey)
    const native  = account.balances.find(b => b.asset_type === 'native')
    return native ? parseFloat(native.balance).toFixed(4) : '0.0000'
  } catch {
    return '0.0000'
  }
}

// ── Contract read helpers ─────────────────────────────────────────────────────

async function buildSimTx(fnName, ...args) {
  const contract = new StellarSdk.Contract(CONTRACT_ID)
  const account  = await rpc.getAccount(SIM_ACCOUNT)
  return new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(fnName, ...args))
    .setTimeout(30)
    .build()
}

export async function fetchPollResults() {
  try {
    const [votesSim, totalSim] = await Promise.all([
      rpc.simulateTransaction(await buildSimTx('get_votes')),
      rpc.simulateTransaction(await buildSimTx('get_total')),
    ])

    const votes = [0, 0, 0, 0]

    if (votesSim?.result?.retval) {
      const native = StellarSdk.scValToNative(votesSim.result.retval)
      if (native && typeof native === 'object') {
        Object.entries(native).forEach(([k, v]) => {
          const i = Number(k)
          if (i >= 0 && i < 4) votes[i] = Number(v) || 0
        })
      }
    }

    let total = 0
    if (totalSim?.result?.retval) {
      total = Number(StellarSdk.scValToNative(totalSim.result.retval)) || 0
    }

    return { votes, total }
  } catch (err) {
    console.warn('fetchPollResults error:', err.message)
    return { votes: [0, 0, 0, 0], total: 0 }
  }
}

export async function checkHasVoted(voterAddress) {
  try {
    const voterScVal = new StellarSdk.Address(voterAddress).toScVal()
    const sim = await rpc.simulateTransaction(
      await buildSimTx('has_voted', voterScVal)
    )
    if (sim?.result?.retval) {
      return StellarSdk.scValToNative(sim.result.retval) === true
    }
    return false
  } catch {
    return false
  }
}

// ── Submit vote ───────────────────────────────────────────────────────────────

export async function submitVote(voterAddress, optionIndex) {
  const contract   = new StellarSdk.Contract(CONTRACT_ID)
  const voterScVal = new StellarSdk.Address(voterAddress).toScVal()
  const indexScVal = StellarSdk.nativeToScVal(optionIndex, { type: 'u32' })

  let account
  try {
    account = await rpc.getAccount(voterAddress)
  } catch {
    throw new Error('Account not found on testnet. Fund it at friendbot first.')
  }

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '500000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('vote', voterScVal, indexScVal))
    .setTimeout(180)
    .build()

  const sim = await rpc.simulateTransaction(tx)

  // Handle simulation errors
  const isSimError =
    (StellarSdk.SorobanRpc?.Api?.isSimulationError?.(sim)) ||
    (StellarSdk.rpc?.Api?.isSimulationError?.(sim)) ||
    (sim.error != null)

  if (isSimError) {
    const msg = (sim.error || '').toLowerCase()
    if (msg.includes('already voted'))  throw new Error('You have already voted!')
    if (msg.includes('invalid option')) throw new Error('Invalid option selected.')
    throw new Error('Contract error: ' + (sim.error || 'unknown'))
  }

  // Assemble transaction with footprint
  const assembleTransaction =
    StellarSdk.SorobanRpc?.assembleTransaction ||
    StellarSdk.rpc?.assembleTransaction

  if (!assembleTransaction) throw new Error('assembleTransaction not found in SDK.')

  const preparedTx = assembleTransaction(tx, sim).build()

  // Sign with Freighter
  let signedXdr
  try {
    signedXdr = await signWithFreighter(preparedTx.toXDR())
  } catch (err) {
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('denied') || msg.includes('rejected') || msg.includes('cancel')) {
      throw new Error('Transaction rejected by user.')
    }
    throw new Error('Signing failed: ' + err.message)
  }

  const signedTx  = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  const sendResp  = await rpc.sendTransaction(signedTx)

  if (sendResp.status === 'ERROR') throw new Error('Transaction submission failed.')

  const hash = sendResp.hash

  // Wait for confirmation
  const GetTransactionStatus =
    StellarSdk.SorobanRpc?.Api?.GetTransactionStatus ||
    StellarSdk.rpc?.Api?.GetTransactionStatus ||
    { SUCCESS: 'SUCCESS', FAILED: 'FAILED' }

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const status = await rpc.getTransaction(hash)
    if (status.status === GetTransactionStatus.SUCCESS) return hash
    if (status.status === GetTransactionStatus.FAILED)  throw new Error('Transaction failed on-chain.')
  }

  throw new Error('Confirmation timeout. Check the explorer for your transaction.')
}