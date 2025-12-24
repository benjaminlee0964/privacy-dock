import type{ FileRecord } from "./PrivacyDockApp";
import "../styles/FileLedger.css";

type FileLedgerProps = {
  address?: `0x${string}`;
  files: FileRecord[];
  isContractValid: boolean;
  isFetching: boolean;
  fetchError: string | null;
  onRefresh: () => void;
  onDecrypt: (index: number) => void;
};

export function FileLedger({
  address,
  files,
  isContractValid,
  isFetching,
  fetchError,
  onRefresh,
  onDecrypt,
}: FileLedgerProps) {
  return (
    <section className="ledger-card">
      <header className="card-header">
        <div>
          <h3>Stored Files</h3>
          <p>Decrypt the address, then recover the IPFS hash locally.</p>
        </div>
        <button className="ghost-button" onClick={onRefresh} type="button">
          Refresh
        </button>
      </header>

      {!address && <p className="status-text">Connect a wallet to view your stored files.</p>}
      {address && !isContractValid && <p className="error-text">Enter a valid contract address to load files.</p>}
      {fetchError && <p className="error-text">{fetchError}</p>}

      {isFetching && <p className="status-text">Loading files from the chain...</p>}

      {!isFetching && address && isContractValid && files.length === 0 && (
        <div className="empty-state">
          <p>No files stored yet.</p>
          <span>Upload a file to populate your encrypted ledger.</span>
        </div>
      )}

      <div className="file-list">
        {files.map((file, index) => {
          const date = new Date(Number(file.timestamp) * 1000);
          return (
            <article
              className="file-card"
              key={`${file.name}-${index}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="file-header">
                <div>
                  <h4>{file.name}</h4>
                  <p className="file-meta">{date.toLocaleString()}</p>
                </div>
                <button
                  className="primary-button small"
                  type="button"
                  onClick={() => onDecrypt(index)}
                  disabled={file.decrypting}
                >
                  {file.decrypting ? "Decrypting..." : file.decryptedHash ? "Re-decrypt" : "Decrypt"}
                </button>
              </div>

              <div className="file-row">
                <span>Encrypted hash</span>
                <code>{file.encryptedHash.slice(0, 24)}...</code>
              </div>
              <div className="file-row">
                <span>Address handle</span>
                <code>{file.encryptedAddress.slice(0, 18)}...</code>
              </div>

              {file.decryptedAddress && file.decryptedHash && (
                <div className="file-decrypted">
                  <div className="file-row">
                    <span>Decrypted address</span>
                    <code>{file.decryptedAddress}</code>
                  </div>
                  <div className="file-row">
                    <span>Recovered IPFS hash</span>
                    <code>{file.decryptedHash}</code>
                  </div>
                </div>
              )}

              {file.error && <p className="error-text">{file.error}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
