import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-shell">
        <div className="brand">
          <div className="brand-mark">PD</div>
          <div>
            <p className="brand-kicker">Privacy Dock</p>
            <h1 className="brand-title">Encrypted File Ledger</h1>
          </div>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
