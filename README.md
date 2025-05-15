# 🚀 CREATE3 Factory: Deterministic Smart Contract Deployment (Same Address Across All EVM Chains)

`CREATE3` enables deploying contracts at **the same address on every EVM-compatible blockchain**, without depending on deployer wallets or nonces — perfect for multi-chain deployments, wallet abstraction tooling, or predictable address registries.

---

## 🔧 What Is `CREATE3`?

CREATE3 is a deterministic contract deployment pattern that uses:

* `CREATE2` to deploy a lightweight **proxy contract**
* Then the proxy uses `CREATE` (nonce = 1) to deploy your actual contract

This results in a **stable and predictable address**, even if:

* You use different wallets
* Nonces change
* You deploy on different chains

---

![4c7aab4f-0d1e-4e10-ae35-1018c50f9d05](https://github.com/user-attachments/assets/e85c9785-1693-4436-ae00-a6017c614551)

## 🔄 CREATE vs CREATE2 vs CREATE3 — Key Differences

| Feature                   | `CREATE`                     | `CREATE2`                          | `CREATE3`                           |
| ------------------------- | ---------------------------- | ---------------------------------- | ----------------------------------- |
| Address Depends On        | Sender + Nonce               | Sender + Salt + Bytecode           | Sender + Salt                      |
| Predictable Address       | ❌ No                         | ✅ Yes                              | ✅ Yes                               |
| Re-deploy to Same Address | ❌ Not Possible               | ✅ As long as bytecode is the same  | ✅ As long as salt isn’t reused      |
| Multi-chain Consistency   | ❌ Deployers differ per chain | ⚠️ Must use same deployer and salt | ✅ Use same factory + salt on chains |



## 📦 How CREATE3 Works (Visual Flow)

```
Your Wallet ─────▶ CREATE3Factory ─────▶ Proxy (via CREATE2) ─────▶ Your Contract (via CREATE)
                                             │                             ▲
                                             └──── Deterministic Address ─┘
```

---

## 📍 Address Calculation Breakdown

1. **Proxy Address (via CREATE2)**:

```solidity
keccak256(0xff ++ factory_address ++ salt ++ keccak256(proxy_bytecode))[12:]
```

2. **Final Contract Address (via CREATE with nonce 1)**:

```solidity
keccak256(rlp(proxy_address, 1))[12:]
```

✅ This means the final deployed address is **completely deterministic**, as long as:

* The factory is at the same address
* The salt and bytecode are identical

---

## 🔁 Real Deployment Example (With Dummy Values)

Let’s say you're using:

| Item                    | Value                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| Factory Address         | `0x5E4ce3a08eE0fc593831207732d143A44294aD9D`                         |
| Salt                    | `0x000000000000000000000000000000000000000000000000000000000000C0DE` |
| Deployer Wallet         | `0x54bE460aB1ba23593342F254E542610a0Bb3a256`                         |
| Proxy Bytecode Hash     | `0xabc123...`                                                        |
| Final Contract Bytecode | Your `ExampleContract` init code                                     |

### ✨ Final Deployment Address:

1. Proxy:
   `0xC7E84B88Bb47a0374eB7D4Fc500E7885c40E14a3`

2. Final Deployed Contract:
   `0x84e81f5377B9fBC409eb21e4589987D1036C7F91`

These addresses will be **the same across Ethereum, Arbitrum, Base, etc.**, if you:

* Deploy `CREATE3Factory` at the same address
* Use the same salt + bytecode

---

## ⚠️ Important: Deploying CREATE3Factory Correctly

### ❌ Problem:

If you use the same wallet but different nonces on each chain, the factory will be deployed at different addresses.

## ⚠️ Important Notes

* If the **factory contract is deployed using `CREATE`**, its address will depend on the deployer’s nonce. That’s why you must:

  * Use a **fresh wallet** with nonce = 0 or needs to be same nounce in all the blockchain


---


Example:

```bash
# Sepolia
Nonce = 0 → Factory address = 0x5E4ce3...

# Base
Nonce = 1 → Factory address = 0xff08...
```

### ✅ Solution: Use Fresh Wallet

Use a fresh wallet (with `nonce = 0`) on every chain to ensure the `CREATE3Factory` is deployed at the **same address** everywhere.

---

## 📁 Project Structure

```
├── contracts/
│   ├── CREATE3Factory.sol
│   ├── ICREATE3Factory.sol
│   └── library/
│       ├── CREATE3.sol
│       └── Bytes32AddressLib.sol
├── scripts/
│   ├── deploy-create3-factory.ts
│   └── deploy.ts
├── deployments/
│   └── factory-[network].json
└── README.md
```

---

## 📤 Deployment Guide

### ✅ Prerequisites

* Node.js v16+
* Hardhat
* Ethers.js
* TypeScript

### ⚙️ Setup

```bash
clone 
npm install
```

---

## 🔐 Environment Variables

Edit the `.env` file and add your private keys:

```env
CREATE3_DEPLOYER_AT_SAME_ADDRESS_PRIVATE_KEY=your_fresh_wallet_private_key
SMART_CONTRACT_DEPLOYER_AT_SAME_ADDRESS=your_second_wallet_private_key
```

Deploy to Sepolia (or any other EVM network):

```bash
npx hardhat run scripts/deployall.ts --network Ethereum_SEPOLIA
```

This will:

1. Deploy the `Create3Factory`:

   ```bash
   npx hardhat run scripts/deploy-create3-factory.ts --network Ethereum_SEPOLIA
   ```
2. Deploy the `ExampleContract` using the deployed factory:

   ```bash
   npx hardhat run scripts/deploy.ts --network Ethereum_SEPOLIA
   ```

Repeat the same command for other networks like Arbitrum, Optimism, Base, etc.

---
---
