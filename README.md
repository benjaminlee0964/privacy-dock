# Privacy Dock

Privacy Dock is a Web3 file registry that keeps file metadata private while proving ownership and persistence on-chain.
Users select a local file, a mock IPFS upload returns a random IPFS hash, and that hash is encrypted with a locally
generated EVM address. The encrypted IPFS hash, the encrypted address, and the file name are stored on-chain. When the
user later chooses to decrypt, the address is decrypted first and then used to decrypt the IPFS hash.

This project focuses on privacy-first metadata storage and retrieval using Zama's FHEVM. It avoids mock data in the UI
and implements the full end-to-end flow required by the product.

## Problem It Solves

Traditional file registries expose file hashes, file names, or access details on-chain. This makes sensitive metadata
public and permanently indexable. Privacy Dock solves this by:
- Keeping the IPFS hash encrypted on-chain.
- Avoiding public exposure of the encryption key material by encrypting the locally generated EVM address.
- Allowing users to recover the hash only when they explicitly decrypt.

## Advantages

- On-chain persistence of file metadata without exposing the underlying content address.
- End-to-end encryption flow that never relies on mock data in the UI.
- Explicit separation of read and write paths (read with viem, write with ethers) for clarity and compatibility.
- Works on a public testnet, so the flow can be demonstrated without local networks.

## How It Works (End-to-End)

1. User selects a local file.
2. The app performs a mock IPFS upload and returns a random IPFS hash.
3. The app generates a random EVM address A locally.
4. The IPFS hash is encrypted using address A as the key material.
5. The app encrypts address A using Zama FHEVM tooling.
6. The file name, encrypted IPFS hash, and encrypted address A are stored on-chain.
7. The user fetches their file entries from the chain.
8. On "Decrypt", the app decrypts address A, then uses A to decrypt the IPFS hash.

## Architecture Overview

- Smart Contracts (Hardhat): Store file metadata and encrypted payloads.
- Frontend (React + Vite): Handles file selection, encryption steps, and user interactions.
- Zama FHEVM: Provides encrypted data types and decryption workflow.
- Mock IPFS: Simulates upload and returns a random IPFS hash for the encryption flow.

## Data Stored On-Chain

Each file entry includes:
- `fileName`: Human-readable name chosen by the user.
- `encryptedIpfsHash`: The IPFS hash encrypted with locally generated address A.
- `encryptedAddressA`: The encryption material needed to decrypt the IPFS hash.
- Additional metadata such as ownership and timestamps may be included depending on contract design.

## Tech Stack

- Smart contracts: Solidity + Hardhat
- FHE layer: Zama FHEVM
- Frontend: React + Vite
- Web3: ethers (writes), viem (reads)
- Wallet UX: Rainbow

## Repository Layout

```
contracts/   Solidity contracts
deploy/      Deployment scripts
tasks/       Hardhat tasks
test/        Contract tests
src/         Frontend source
docs/        Zama-related documentation
```

## Local Development

### Prerequisites

- Node.js 20+
- npm
- A Sepolia wallet and RPC access

### Install

```bash
npm install
```

### Environment

Create a `.env` file with:

```
INFURA_API_KEY=your_infura_api_key
PRIVATE_KEY=your_private_key
```

Notes:
- Only `PRIVATE_KEY` is used for deployment. MNEMONIC is not used.
- The frontend does not use environment variables.

### Build and Test

```bash
npm run compile
npm run test
```

### Deploy Locally, Then Sepolia

1. Start a local Hardhat node:

```bash
npx hardhat node
```

2. Deploy to local node:

```bash
npx hardhat deploy --network localhost
```

3. Deploy to Sepolia (after tasks/tests pass):

```bash
npx hardhat deploy --network sepolia
```

## Frontend Usage

1. Connect a wallet on Sepolia.
2. Select a file.
3. Upload, encrypt, and store on-chain (no mock UI data; all flows are real).
4. View your stored file list from the chain.
5. Click "Decrypt" to recover the IPFS hash.

Notes:
- The UI does not use `localhost` networks.
- The UI does not use localStorage.
- The frontend uses the ABI generated from `deployments/sepolia`.

## Security and Privacy Model

- The IPFS hash is encrypted before storage.
- The encryption material (address A) is also encrypted.
- Decryption is user-driven and explicit.
- Metadata privacy is preserved on-chain; only encrypted blobs are public.

## Limitations

- IPFS uploads are mocked and return a random hash.
- The system currently stores file metadata, not the file itself.
- Access sharing and multi-user delegation are not yet implemented.

## Future Plans

- Integrate real IPFS or another content-addressable storage network.
- Add optional encrypted metadata fields (size, MIME type).
- Implement sharing with encrypted access control.
- Improve indexing and search over encrypted metadata.
- Provide a download flow that resolves the decrypted IPFS hash.
- Expand test coverage and add audits for FHE-related logic.

## References

- Zama FHEVM documentation: `docs/zama_llm.md`
- Zama relayer documentation: `docs/zama_doc_relayer.md`
