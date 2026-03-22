# ◈ StellarPoll 

> Production-ready on-chain polling dApp with inter-contract calls, custom token rewards, CI/CD pipeline, and full mobile responsive design.

---

##  Important Links

| Item | Link |
|---|---|
|  GitHub Repository | https://github.com/vishvajitbhagave-dev/Stellar_Poll |
|  Live Demo | https://stellar-poll-lac.vercel.app/ |
|  Demo Video | [Add your video link here] |
|  Poll Contract | https://stellar.expert/explorer/testnet/contract/CDSVXG7VBBP2IASOP4V4ARRZNVPI2VHX5ARJEY7ZZD6K2WCGFAC54S4V |
|  Token Contract | https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCNM |
|  Deploy TX | https://stellar.expert/explorer/testnet/tx/41fc8025e30c4a788b2deac516a60cfa761976b185d7b6b61d6c93e5e6043b7d |

---

##  Project Description

**StellarPoll** is a production-ready decentralized polling dApp on Stellar Testnet. Every vote is recorded on-chain via Soroban smart contracts, with inter-contract calls that automatically reward voters with POLL tokens.

---

##  Green Belt Requirements — All Fulfilled

| Requirement | Implementation | Status |
|---|---|---|
| Inter-contract call working | Poll Contract calls Token Contract on every vote to send reward | ✅ |
| Custom token deployed | POLL token contract deployed on Stellar Testnet | ✅ |
| CI/CD running | GitHub Actions pipeline — runs tests + builds on every push | ✅ |
| Mobile responsive | Full responsive design — works on phone, tablet, desktop | ✅ |
| Minimum 8+ commits | See commit history | ✅ |
| Live demo | See link above | ✅ |
| README complete | This document | ✅ |

---

##  Inter-Contract Call Explained

When a user votes, the Poll Contract makes an **inter-contract call** to the Token Contract:

```
User clicks Vote
      ↓
Poll Contract (CDSVXG7...)
      ↓ inter-contract call
Token Contract (CDLZFC3...)
      ↓
1 POLL Token transferred to voter's wallet
```

This is implemented in `contract/src/lib.rs`:
```rust
let token_client = token::Client::new(&env, &token_contract);
token_client.transfer(&admin, &voter, &10_000_000i128);
```

---

## 🪙 Token Information

| Item | Value |
|---|---|
| Token Contract | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCNM` |
| Reward per vote | 1 POLL token (10,000,000 strobes) |
| Purpose | Reward voters for participating |

---

## 🔄 CI/CD Pipeline

GitHub Actions runs automatically on every push to `main`:

```yaml
Jobs:
  1. test    → npm install → npm test → npm run build
  2. deploy  → Deploy to Vercel (on main branch only)
```

**Pipeline file:** `.github/workflows/ci.yml`

---

## 📱 Mobile Responsive Design

The app is fully responsive across all screen sizes:

| Screen | Layout |
|---|---|
| Desktop (>768px) | Two-column layout — poll left, stats right |
| Tablet (480-768px) | Single column, stats shown above poll |
| Mobile (<480px) | Compact single column, hidden non-essential elements |

---

## Screenshots

### Mobile View
> Add screenshot of app on mobile screen

### CI/CD Pipeline
<img width="959" height="503" alt="image" src="https://github.com/user-attachments/assets/b897937d-0c7f-4205-9b8a-803c4fc55b62" />

### Wallet Options


### Test Output
```
Tests  35 passed (35)
```
> Add screenshot of npm test output

---

## Setup — Run Locally

```bash
git clone https://github.com/vishvajitbhagave-dev/Stellar_Poll
cd Stellar_Poll/stellar-poll
npm install
npm run dev
```

Open **http://localhost:5173**

---

##  Running Tests

```bash
npm test
```

---

##  Project Structure

```
stellar-poll/
├── .github/
│   └── workflows/
│       └── ci.yml           # CI/CD pipeline
├── src/
│   ├── App.jsx              # Main UI — mobile responsive
│   ├── App.css              # Full responsive styles
│   ├── stellar.js           # Blockchain logic + inter-contract
│   ├── index.css            # Global styles
│   ├── main.jsx             # Entry point
│   └── __tests__/
│       ├── setup.js
│       └── stellar.test.js  # 35 unit tests
├── contract/
│   ├── src/lib.rs           # Soroban contract with inter-contract call
│   └── Cargo.toml
├── index.html
├── vite.config.js
└── package.json
```

---

##  Contract Addresses

| Contract | Address |
|---|---|
| Poll Contract | `CDSVXG7VBBP2IASOP4V4ARRZNVPI2VHX5ARJEY7ZZD6K2WCGFAC54S4V` |
| Token Contract | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCNM` |

---

##  Resources

- [Stellar Testnet Explorer](https://stellar.expert/explorer/testnet)
- [Freighter Wallet](https://freighter.app)
- [Soroban Docs](https://soroban.stellar.org)
- [Friendbot](https://laboratory.stellar.org/#account-creator?network=test)
