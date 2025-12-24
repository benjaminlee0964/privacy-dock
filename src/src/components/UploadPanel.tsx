import { useRef, useState } from "react";
import { Contract, Wallet } from "ethers";
import { CONTRACT_ABI } from "../config/contracts";
import { encryptWithAddress } from "../utils/crypto";
import { generateMockIpfsHash } from "../utils/ipfs";
import "../styles/UploadPanel.css";

type UploadPanelProps = {
  address?: `0x${string}`;
  contractAddress: string;
  isContractValid: boolean;
  isSepolia: boolean;
  zamaInstance: any;
  zamaLoading: boolean;
  zamaError: string | null;
  signerPromise?: Promise<any>;
  onStored: () => void;
};

type UploadStage = "idle" | "hashing" | "ready" | "encrypting" | "confirming" | "complete";

export function UploadPanel({
  address,
  contractAddress,
  isContractValid,
  isSepolia,
  zamaInstance,
  zamaLoading,
  zamaError,
  signerPromise,
  onStored,
}: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ipfsHash, setIpfsHash] = useState("");
  const [encryptedHash, setEncryptedHash] = useState("");
  const [addressA, setAddressA] = useState("");
  const [stage, setStage] = useState<UploadStage>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setIpfsHash("");
    setEncryptedHash("");
    setAddressA("");
    setStage("idle");
    setStatus("");
    setError(null);
  };

  const handleMockUpload = async () => {
    if (!selectedFile) {
      setError("Choose a file first.");
      return;
    }

    setStage("hashing");
    setStatus("Preparing your file for IPFS...");
    setError(null);

    await new Promise((resolve) => setTimeout(resolve, 500));
    setStatus("Hashing the content locally...");
    await new Promise((resolve) => setTimeout(resolve, 600));

    const hash = generateMockIpfsHash();
    setIpfsHash(hash);
    setStage("ready");
    setStatus("Mock IPFS hash generated.");
  };

  const handleStore = async () => {
    if (!selectedFile || !address || !signerPromise || !zamaInstance) {
      setError("Connect your wallet and load the encryption service.");
      return;
    }
    if (!ipfsHash) {
      setError("Generate the IPFS hash first.");
      return;
    }
    if (!isContractValid) {
      setError("Enter a valid contract address.");
      return;
    }
    if (!isSepolia) {
      setError("Switch your wallet to Sepolia before storing.");
      return;
    }

    setStage("encrypting");
    setError(null);
    setStatus("Encrypting IPFS hash with a fresh address key...");

    try {
      const randomWallet = Wallet.createRandom();
      const randomAddress = randomWallet.address;
      const encryptedIpfsHash = await encryptWithAddress(ipfsHash, randomAddress);

      setStatus("Encrypting the address with Zama FHE...");
      const encryptedInput = await zamaInstance
        .createEncryptedInput(contractAddress, address)
        .addAddress(randomAddress)
        .encrypt();

      const signer = await signerPromise;
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);

      setStage("confirming");
      setStatus("Submitting encrypted metadata to the contract...");
      const tx = await contract.storeFile(
        selectedFile.name,
        encryptedIpfsHash,
        encryptedInput.handles[0],
        encryptedInput.inputProof,
      );
      await tx.wait();

      setAddressA(randomAddress);
      setEncryptedHash(encryptedIpfsHash);
      setStage("complete");
      setStatus("Stored on-chain. Refreshing your ledger...");
      onStored();
    } catch (err) {
      console.error("Failed to store file:", err);
      setError("Failed to store file metadata. Please retry.");
      setStage("ready");
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setIpfsHash("");
    setEncryptedHash("");
    setAddressA("");
    setStage("idle");
    setStatus("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const readyToStore = Boolean(
    selectedFile &&
      ipfsHash &&
      !zamaLoading &&
      zamaInstance &&
      signerPromise &&
      address &&
      isContractValid &&
      isSepolia,
  );

  return (
    <section className="upload-card">
      <header className="card-header">
        <div>
          <h3>Upload + Encrypt</h3>
          <p>Pick a local file, mint a mock IPFS hash, then lock it with a one-time address.</p>
        </div>
        <span className={`status-pill ${stage}`}>{stage === "idle" ? "Draft" : stage}</span>
      </header>

      <div className="upload-body">
        <label className="field-label" htmlFor="file-input">
          Local file
        </label>
        <input
          ref={fileInputRef}
          id="file-input"
          className="file-input"
          type="file"
          onChange={handleFileChange}
        />
        {selectedFile && (
          <div className="file-preview">
            <div>
              <p className="file-name">{selectedFile.name}</p>
              <p className="file-meta">
                Size: {(selectedFile.size / 1024).toFixed(1)} KB / Type: {selectedFile.type || "unknown"}
              </p>
            </div>
            <button className="ghost-button" onClick={handleReset} type="button">
              Clear
            </button>
          </div>
        )}

        <div className="action-row">
          <button
            className="primary-button"
            type="button"
            onClick={handleMockUpload}
            disabled={!selectedFile || stage === "hashing"}
          >
            {stage === "hashing" ? "Hashing..." : "Generate IPFS Hash"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={handleStore}
            disabled={!readyToStore || stage === "encrypting" || stage === "confirming"}
          >
            {stage === "confirming" ? "Confirming..." : "Encrypt + Store"}
          </button>
        </div>

        {status && <p className="status-text">{status}</p>}
        {zamaLoading && <p className="status-text">Loading encryption engine...</p>}
        {error && <p className="error-text">{error}</p>}
        {zamaError && <p className="error-text">{zamaError}</p>}

        {ipfsHash && (
          <div className="result-block">
            <p className="result-title">Mock IPFS hash</p>
            <code className="result-code">{ipfsHash}</code>
          </div>
        )}

        {encryptedHash && addressA && (
          <div className="result-grid">
            <div className="result-block">
              <p className="result-title">Address A (local)</p>
              <code className="result-code">{addressA}</code>
            </div>
            <div className="result-block">
              <p className="result-title">Encrypted IPFS hash</p>
              <code className="result-code">{encryptedHash}</code>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
