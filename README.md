# ◈ StellarPoll 
Live on-chain polling dApp on **Stellar Testnet** using Soroban smart contracts.


## Project Description  

StellarPoll lets users vote on a question where each vote is permanently recorded on the Stellar Blockchain via a Soroban Smart Contract. Results update live every 10 seconds.

**Yellow Belt requirements covered:**
- ✅ Multi-wallet modal (Freighter, xBull, LOBSTR)
- ✅ 3 error types: wallet not found · insufficient balance · user rejected
- ✅ Soroban contract deployed on Testnet
- ✅ Contract called from frontend (vote, get_votes, has_voted)
- ✅ Transaction status: pending → confirming → success / fail
- ✅ Real-time updates every 10 seconds

## Tech Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + Vite (JavaScript) |
| Wallet   | Freighter API v3 |
| Chain    | Stellar Testnet (Soroban RPC) |
| Contract | Soroban (Rust) |


## Setup — Run Locally

### 1. Install dependencies
```bash
npm install
```

### 2. Start dev server
```bash
npm run dev
```
App opens at `http://localhost:5173`

### 3. Install Freighter & fund wallet
- Install: https://freighter.app
- Switch to **Testnet** in Freighter settings
- Fund: https://laboratory.stellar.org/#account-creator?network=test

---

## Smart Contract (Rust / Soroban)

Located in `contract/src/lib.rs`

### Deploy your own (optional — a contract is already set in stellar.js)

```bash
# Install Stellar CLI
cargo install stellar-cli --features opt

# Build
cd contract
stellar contract build

# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_poll_contract.wasm \
  --network testnet \
  --source YOUR_ACCOUNT_NAME

# Initialize
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --network testnet \
  --source YOUR_ACCOUNT_NAME \
  -- init \
  --question "What matters most in a blockchain platform?" \
  --options '["Speed & Low Fees","True Decentralization","Developer Experience","Real World Adoption"]'
```

Then replace `CONTRACT_ID` in `src/stellar.js` with your deployed address.

---

## Contract Info

- **Deployed Contract Address:** `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCNM`
- **Network:** Stellar Testnet
- **Explorer:** https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCNM

---

## Screenshots



---

## Resources

- [Stellar Testnet Explorer](https://stellar.expert/explorer/testnet)
- [Freighter Wallet](https://freighter.app)
- [Soroban Docs](https://soroban.stellar.org)
- [Friendbot (fund testnet)](https://laboratory.stellar.org/#account-creator?network=test)
