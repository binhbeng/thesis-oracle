# Thesis Oracle dApp 🎓

A modern, responsive decentralized application (dApp) built on the Stellar Soroban smart contract network. It allows candidates to propose thesis defenses, committee members to cast approval or rejection votes, and the committee chair to initialize the contract and finalize outcomes on-chain.

---

## 🚀 Live Demo & Deployment
This project is configured to deploy instantly on **Vercel**:
* **Framework Preset**: Vite
* **Build Command**: `npm run build`
* **Output Directory**: `dist`

---

## 🛠️ Features & Roles

### 1. 🔌 Freighter Wallet Integration
* Seamlessly connect to the **Freighter Wallet** browser extension to sign transactions.
* Live wallet status indicator (Connected/Disconnected) with automatic address autofill.
* Supports **Stellar Testnet** transactions.

### 2. 🔍 Public Query (Read-Only)
* **Query Thesis Status**: Inspect the current result status (`pending`, `approved`, `rejected`) and the total number of votes cast for any thesis ID.
* Queries are simulated on-chain via Soroban RPC and do not incur transaction fees.

### 3. 👤 Candidate / Student Role
* **Propose Thesis Defense**: Register a new thesis defense on-chain using a unique Thesis ID and a title symbol. This requires student authorization.

### 4. 🗳️ Committee Member Role
* **Cast Vote**: Vote to either **Approve** or **Reject** a thesis defense. Each committee member is restricted to voting once per thesis ID, and voting is blocked after finalization.

### 5. 👑 Committee Chair Role
* **Initialize Contract**: Set the authorized Committee Chair address. This can only be done once upon initial deployment.
* **Finalize Outcome**: Tally the approve vs. reject votes and permanently lock the result (`approved` or `rejected`) on-chain.

### 6. 💻 Console Diagnostics Terminal
* Interactive logs terminal styled like a console at the bottom of the page, showing step-by-step transaction logs, XDR details, status codes, and direct links to check transactions on the Stellar Expert explorer.

---

## ⚙️ Tech Stack
* **Bundler & Dev Server**: Vite
* **Smart Contract Integration**: `@stellar/stellar-sdk` (v14.4+)
* **Wallet Connection**: `@stellar/freighter-api`
* **UI/Styles**: Vanilla HTML5 & CSS3 with a premium dark glassmorphic design system.

---

## 💻 Local Development

### 1. Install dependencies:
```bash
npm install
```

### 2. Run the dev server:
```bash
npm run dev
```

### 3. Build for production:
```bash
npm run build
```
The compiled build output will be stored in the `/dist` directory.
