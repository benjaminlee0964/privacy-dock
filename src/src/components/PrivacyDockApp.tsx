import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { createPublicClient, http, isAddress } from "viem";
import { sepolia } from "viem/chains";
import { useZamaInstance } from "../hooks/useZamaInstance";
import { useEthersSigner } from "../hooks/useEthersSigner";
import { CONTRACT_ABI, DEFAULT_CONTRACT_ADDRESS } from "../config/contracts";
import { decryptWithAddress } from "../utils/crypto";
import { Header } from "./Header";
import { UploadPanel } from "./UploadPanel";
import { FileLedger } from "./FileLedger";
import "../styles/PrivacyDockApp.css";

const RPC_URL = "";

export type FileRecord = {
  name: string;
  encryptedHash: string;
  encryptedAddress: `0x${string}`;
  timestamp: bigint;
  decryptedAddress?: string;
  decryptedHash?: string;
  decrypting?: boolean;
  error?: string;
};

export function PrivacyDockApp() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isContractValid = isAddress(contractAddress);
  const isSepolia = chainId === sepolia.id;

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: sepolia,
        transport: http(RPC_URL),
      }),
    [],
  );

  const fetchFiles = useCallback(async () => {
    if (!address || !isContractValid) {
      setFiles([]);
      setFetchError(null);
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    setFetchError(null);

    try {
      const count = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: "getFileCount",
        args: [address],
      });

      const total = Number(count);
      if (!total) {
        setFiles([]);
        return;
      }

      const entries = await Promise.all(
        Array.from({ length: total }, (_, index) =>
          publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: "getFile",
            args: [address, BigInt(index)],
          }),
        ),
      );

      const nextFiles = entries.map((entry) => ({
        name: entry[0],
        encryptedHash: entry[1],
        encryptedAddress: entry[2],
        timestamp: entry[3],
      }));

      setFiles(nextFiles);
    } catch (error) {
      console.error("Failed to fetch files:", error);
      setFetchError("Unable to load files from the contract.");
    } finally {
      setIsFetching(false);
    }
  }, [address, contractAddress, isContractValid, publicClient]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDecrypt = useCallback(
    async (index: number) => {
      if (!instance || !address || !signerPromise || !isContractValid) {
        return;
      }

      setFiles((prev) =>
        prev.map((file, fileIndex) =>
          fileIndex === index ? { ...file, decrypting: true, error: undefined } : file,
        ),
      );

      try {
        const signer = await signerPromise;
        if (!signer) {
          throw new Error("Wallet signer not available");
        }

        const target = files[index];
        const keypair = instance.generateKeypair();
        const handleContractPairs = [
          {
            handle: target.encryptedAddress,
            contractAddress,
          },
        ];
        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = "7";
        const contractAddresses = [contractAddress];

        const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
        const signature = await signer.signTypedData(
          eip712.domain,
          { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
          eip712.message,
        );

        const result = await instance.userDecrypt(
          handleContractPairs,
          keypair.privateKey,
          keypair.publicKey,
          signature.replace("0x", ""),
          contractAddresses,
          address,
          startTimeStamp,
          durationDays,
        );

        const decryptedAddress = result[target.encryptedAddress];
        if (!decryptedAddress) {
          throw new Error("Decryption failed for address handle");
        }

        const decryptedHash = await decryptWithAddress(target.encryptedHash, decryptedAddress);

        setFiles((prev) =>
          prev.map((file, fileIndex) =>
            fileIndex === index
              ? {
                  ...file,
                  decryptedAddress,
                  decryptedHash,
                  decrypting: false,
                }
              : file,
          ),
        );
      } catch (error) {
        console.error("Failed to decrypt:", error);
        setFiles((prev) =>
          prev.map((file, fileIndex) =>
            fileIndex === index
              ? {
                  ...file,
                  decrypting: false,
                  error: "Decryption failed. Please try again.",
                }
              : file,
          ),
        );
      }
    },
    [address, contractAddress, files, instance, isContractValid, signerPromise],
  );

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <section className="hero">
          <div>
            <p className="hero-kicker">Local file -{'>'} mock IPFS -{'>'} encrypted ledger</p>
            <h2 className="hero-title">Seal every file with a one-time address key.</h2>
            <p className="hero-subtitle">
              Generate a random address on your device, encrypt the IPFS hash locally, and store the encrypted address
              with Zama FHE on-chain.
            </p>
          </div>
          <div className="hero-panel">
            <label className="address-label" htmlFor="contract-address">
              Contract address
            </label>
            <input
              id="contract-address"
              className="address-input"
              value={contractAddress}
              onChange={(event) => setContractAddress(event.target.value.trim())}
              placeholder="0x..."
            />
            <div className="address-hints">
              <span className={isContractValid ? "hint good" : "hint bad"}>
                {isContractValid ? "Valid address" : "Enter a valid contract address"}
              </span>
              <span className={isSepolia ? "hint good" : "hint warn"}>
                {isSepolia ? "Sepolia network detected" : "Switch wallet to Sepolia"}
              </span>
            </div>
          </div>
        </section>

        <section className="layout-grid">
          <UploadPanel
            address={address}
            contractAddress={contractAddress}
            isContractValid={isContractValid}
            isSepolia={isSepolia}
            zamaInstance={instance}
            zamaLoading={zamaLoading}
            zamaError={zamaError}
            signerPromise={signerPromise}
            onStored={fetchFiles}
          />
          <FileLedger
            address={address}
            files={files}
            isContractValid={isContractValid}
            isFetching={isFetching}
            fetchError={fetchError}
            onRefresh={fetchFiles}
            onDecrypt={handleDecrypt}
          />
        </section>
      </main>
    </div>
  );
}
