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
|  Live Demo | [Add your Vercel/Netlify link here — Optional] |

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

##  New Features Added in Orange Belt (vs Yellow Belt)

| Feature | Description |
|---|---|
| **Skeleton Loader** | Animated grey placeholder boxes shown while blockchain data loads |
| **Progress Ring** | Animated SVG circular ring per option showing vote percentage |
| **Progress Bar** | Horizontal bar under each option fills with vote percentage |
| **Refresh Progress Bar** | Thin bar at top of page animates every 10 seconds showing next refresh |
| **Button Spinner** | Loading spinner inside Submit button while transaction is processing |
| **8-Second Cache** | Poll results cached for 8 seconds to reduce RPC calls |
| **Per-Address Cache** | Remembers if wallet already voted — avoids repeated blockchain checks |
| **Optimistic UI Update** | Vote count updates instantly on screen after voting without waiting for chain |
| **Results Breakdown Card** | Dedicated sidebar card showing all options with animated bars |
| **Deployment Info Card** | Contract address and TX hash shown in sidebar with Explorer links |
| **30 Unit Tests** | Complete test suite covering all utility functions |
| **Auto Invalidation** | Cache cleared after voting so next fetch gets fresh results |

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

---

##  Screenshots

### 1. Wallet Options Modal
> Add screenshot showing 3 wallet options (Freighter, xBull, LOBSTR)

### 2. Poll with Results
> Add screenshot showing poll with progress rings and percentages after voting

### 3. Transaction Success
> Add screenshot showing "Vote recorded on-chain!" with TX hash link

### 4. Test Output (30 passing)
> Add screenshot of terminal showing `npm test` with 30 tests passing

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

## Running Tests

```bash
npm test
```

To run in watch mode (re-runs on file save):
```bash
npm run test:watch
```

---

## Smart Contract

**Language:** Rust (Soroban SDK)
**Location:** `contract/src/lib.rs`
**Network:** Stellar Testnet

### Deployed Contract Address
```
CDSVXG7VBBP2IASOP4V4ARRZNVPI2VHX5ARJEY7ZZD6K2WCGFAC54S4V
```

### Contract Functions

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `init` | `question: String, options: Vec<String>` | — | Initialize poll — called once after deploy |
| `vote` | `voter: Address, option_index: u32` | — | Cast a vote — requires wallet auth |
| `get_vote0` | — | `u32` | Vote count for option 0 |
| `get_vote1` | — | `u32` | Vote count for option 1 |
| `get_vote2` | — | `u32` | Vote count for option 2 |
| `get_vote3` | — | `u32` | Vote count for option 3 |
| `get_total` | — | `u32` | Total votes cast |
| `get_question` | — | `String` | Poll question |
| `has_voted` | `voter: Address` | `bool` | Check if address already voted |

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

## Caching Implementation

The app implements a basic in-memory caching system in `src/stellar.js`:

```
Cache TTL: 8 seconds

┌─────────────────────────────────────────┐
│              CACHE OBJECT               │
├─────────────────┬───────────────────────┤
│ results         │ Last fetched poll data │
│ timestamp       │ When data was fetched  │
│ hasVoted{}      │ Per-address vote status│
└─────────────────┴───────────────────────┘

Flow:
1. Frontend requests poll results
2. Cache valid? → Return cached data (fast)
3. Cache expired? → Fetch from blockchain (slow)
4. After voting → Invalidate cache immediately
```

---

## Loading States

| State | What User Sees |
|---|---|
| **Initial load** | Skeleton loader — animated grey boxes |
| **Background refresh** | Thin progress bar at top of page |
| **Submitting vote** | Spinner inside submit button |
| **TX pending** | Blue banner with spinner |
| **TX confirming** | Yellow banner with spinner |
| **TX success** | Green banner with TX hash link |
| **TX failed** | Red banner with error message |

---

## Error Handling 

| Error Type | When It Happens | What User Sees |
|---|---|---|
| **Wallet Not Found** | Freighter not installed | Yellow warning banner |
| **Insufficient Balance** | Less than 1 XLM in wallet | Red warning banner |
| **Transaction Rejected** | User clicks reject in Freighter | Red error banner |
| **Already Voted** | Same wallet tries to vote twice | Yellow warning banner |

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

## Commit History

| Commit | Description |
|---|---|
| Commit 1 | `feat: Add 30 unit tests with Vitest for Orange Belt` |
| Commit 2 | `feat: Add skeleton loading states, progress rings and improved UI` |
| Commit 3 | `feat: Add caching layer, auto-refresh and Orange Belt enhancements` |

---

## Resources

- [Stellar Testnet Explorer](https://stellar.expert/explorer/testnet)
- [Freighter Wallet](https://freighter.app)
- [Soroban Documentation](https://soroban.stellar.org)
- [Friendbot — Fund Testnet Wallet](https://laboratory.stellar.org/#account-creator?network=test)
- [Vitest Documentation](https://vitest.dev)
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
