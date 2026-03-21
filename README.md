# ◈ StellarPoll 

> A complete end-to-end live polling dApp on **Stellar Testnet** powered by Soroban smart contracts, with loading states, caching, and 30 unit tests.

---

## Important Links

| Item | Link |
|---|---|
|  GitHub Repository | https://github.com/vishvajitbhagave-dev/Stellar_Poll |
|  Contract Explorer | https://stellar.expert/explorer/testnet/contract/CDSVXG7VBBP2IASOP4V4ARRZNVPI2VHX5ARJEY7ZZD6K2WCGFAC54S4V |
|  Deploy TX | https://stellar.expert/explorer/testnet/tx/41fc8025e30c4a788b2deac516a60cfa761976b185d7b6b61d6c93e5e6043b7d |
|  Init TX | https://stellar.expert/explorer/testnet/tx/2eaba20d07fab964a757d9b5c957fede094d7009eaa456e4317d537759f41680 |
|  Demo Video | [Add your video link here] |
|  Live Demo | https://stellar-poll-lac.vercel.app/ |

---

## Project Description

**StellarPoll** is a fully decentralized live polling dApp where every vote is permanently recorded on the Stellar blockchain via a Soroban smart contract. No backend server, no database — everything runs on-chain.

Users can:
- Connect their Freighter wallet
- Vote on a live question
- See real-time results with animated progress bars
- View their transaction on Stellar Explorer

---

## ✅ Orange Belt Requirements — All Fulfilled

| Requirement | Implementation | Status |
|---|---|---|
| Mini-dApp fully functional | Voting works end-to-end on Stellar Testnet | ✅ |
| Loading states | Skeleton loader, progress rings, refresh bar, spinner | ✅ |
| Progress indicators | Animated SVG rings + progress bars per option | ✅ |
| Basic caching | 8-second result cache + per-address vote cache | ✅ |
| Minimum 3 tests passing | 30 unit tests across 6 test suites | ✅ |
| README complete | This document | ✅ |
| Demo video | See link above | ✅ |
| Minimum 3+ meaningful commits | See commit history on GitHub | ✅ |

---

##  Tests — 30 Passing

Run tests with:
```bash
npm test
```

### Test Output
```
✓ src/__tests__/stellar.test.js (30)
  ✓ isValidStellarAddress (6)
  ✓ formatBalance (6)
  ✓ shortAddress (4)
  ✓ calcPercentages (5)
  ✓ Cache (5)
  ✓ Poll Configuration (4)

Test Files  1 passed (1)
Tests       30 passed (30)
Duration    ~1.6s
```

>  Screenshot of test output — see below
<img width="1828" height="894" alt="Screenshot 2026-03-20 112758" src="https://github.com/user-attachments/assets/24e583d6-7fa7-49b9-9aa2-8c42527a68b0" />

---

##  Screenshots

<img width="1919" height="870" alt="Screenshot 2026-03-20 150549" src="https://github.com/user-attachments/assets/9f65b722-f485-42f3-a823-d16779aec90a" />

<img width="1919" height="873" alt="Screenshot 2026-03-20 150622" src="https://github.com/user-attachments/assets/683f0c0f-db6c-47e9-8ced-667aff311404" />

<img width="1919" height="935" alt="Screenshot 2026-03-20 150651" src="https://github.com/user-attachments/assets/f3deb4f7-4ea7-459b-9985-d0855e470e6f" />

<img width="1919" height="876" alt="Screenshot 2026-03-20 150752" src="https://github.com/user-attachments/assets/7fc39ca2-baac-4091-8367-15acbca84ba8" />

<img width="1919" height="881" alt="Screenshot 2026-03-20 151027" src="https://github.com/user-attachments/assets/ebdbe1bb-1652-4e93-baa9-17e552332a5d" />

<img width="1919" height="881" alt="Screenshot 2026-03-20 151101" src="https://github.com/user-attachments/assets/92d4ee00-93ce-4fb0-99ef-89e6751c5556" />

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (JavaScript) |
| Testing | Vitest + @testing-library/react |
| Wallet | Freighter API v3 |
| Blockchain | Stellar Testnet |
| Smart Contract | Soroban (Rust) |
| RPC | Soroban RPC + Direct JSON-RPC calls |

---

## Setup — Run Locally

### Step 1 — Clone the repository
```bash
git clone https://github.com/vishvajitbhagave-dev/Stellar_Poll
cd Stellar_Poll/stellar-poll
```

### Step 2 — Install dependencies
```bash
npm install
```

### Step 3 — Start development server
```bash
npm run dev
```
Open **http://localhost:5173**

### Step 4 — Setup Freighter Wallet
- Install Freighter: https://freighter.app
- Open Freighter → Settings → Switch to **Testnet**
- Fund your wallet: https://laboratory.stellar.org/#account-creator?network=test

---

## Smart Contract

### Deployed Contract Address
```
CDSVXG7VBBP2IASOP4V4ARRZNVPI2VHX5ARJEY7ZZD6K2WCGFAC54S4V
```
### Deploy Your Own Contract
 
```bash
cd contract
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/stellar_poll_contract.wasm --network testnet --source YOUR_ACCOUNT
```
 
Initialize (run in CMD):
```bash
stellar contract invoke --id YOUR_CONTRACT_ID --network testnet --source YOUR_ACCOUNT -- init --question "What matters most in a blockchain platform?" --options "[\"Speed and Low Fees\",\"True Decentralization\",\"Developer Experience\",\"Real World Adoption\"]"
```
 
---

## Project Structure

```
stellar-poll/
├── src/
│   ├── App.jsx              # Main React app — all UI components
│   ├── App.css              # Complete styling
│   ├── stellar.js           # All blockchain logic + caching
│   ├── index.css            # Global styles + CSS variables
│   ├── main.jsx             # React entry point
│   └── __tests__/
│       ├── setup.js         # Vitest setup file
│       └── stellar.test.js  # 30 unit tests
├── contract/
│   ├── src/
│   │   └── lib.rs           # Soroban smart contract (Rust)
│   └── Cargo.toml           # Rust dependencies
├── index.html               # HTML entry point
├── vite.config.js           # Vite + Vitest configuration
├── package.json             # Node dependencies
└── README.md                # This file
```

---

## Resources

- [Stellar Testnet Explorer](https://stellar.expert/explorer/testnet)
- [Freighter Wallet](https://freighter.app)
- [Soroban Documentation](https://soroban.stellar.org)
- [Friendbot — Fund Testnet Wallet](https://laboratory.stellar.org/#account-creator?network=test)
- [Vitest Documentation](https://vitest.dev)
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
