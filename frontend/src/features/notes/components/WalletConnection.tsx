import { useEffect, useState } from "react";
import { AlertCircle, Loader2, LogOut, Wallet } from "lucide-react";
import type { ConnectedWallet, WalletOption } from "../../../types/cardano-wallet";

interface WalletConnectionProps {
  wallets: WalletOption[];
  connectedWallet: ConnectedWallet | null;
  isConnecting: boolean;
  error: string;
  onConnect: (walletId?: string) => Promise<ConnectedWallet>;
  onDisconnect: () => void;
  compact?: boolean;
  variant?: "default" | "sidebar";
}

export default function WalletConnection({
  wallets,
  connectedWallet,
  isConnecting,
  error,
  onConnect,
  onDisconnect,
  compact = false,
  variant = "default",
}: WalletConnectionProps) {
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const isSidebar = variant === "sidebar";
  const panelBorder = isSidebar ? "rgba(255, 255, 255, 0.1)" : "var(--border-light)";
  const panelBackground = isSidebar ? "rgba(255, 255, 255, 0.05)" : "#FFFFFF";
  const textColor = isSidebar ? "#FFFFFF" : "var(--text-main)";
  const mutedColor = isSidebar ? "#A8A29E" : "var(--text-muted)";
  const iconBackground = isSidebar ? "rgba(245, 165, 102, 0.14)" : "#F3EFEA";
  const iconColor = isSidebar ? "var(--accent-orange)" : "#6E5A47";
  const actionBackground = isSidebar ? "var(--accent-orange)" : "#221811";
  const actionColor = isSidebar ? "var(--bg-sidebar)" : "#FFFFFF";
  const disabledBackground = isSidebar ? "rgba(255, 255, 255, 0.18)" : "#A8A29E";

  useEffect(() => {
    if (!selectedWalletId && wallets[0]) {
      setSelectedWalletId(wallets[0].id);
    }
  }, [selectedWalletId, wallets]);

  if (connectedWallet) {
    return (
      <div
        style={{
          border: `1px solid ${panelBorder}`,
          borderRadius: "8px",
          backgroundColor: panelBackground,
          padding: compact ? "10px 12px" : "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          minWidth: compact && !isSidebar ? "260px" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <WalletIcon wallet={connectedWallet} variant={variant} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: textColor }}>
              {connectedWallet.name}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: mutedColor,
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {formatWalletAddress(connectedWallet.address)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDisconnect}
          title="Disconnect wallet"
          style={{
            border: `1px solid ${panelBorder}`,
            backgroundColor: isSidebar ? "rgba(255, 255, 255, 0.06)" : "#FFFFFF",
            borderRadius: "8px",
            width: "34px",
            height: "34px",
            color: textColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        border: `1px solid ${panelBorder}`,
        borderRadius: "8px",
        backgroundColor: panelBackground,
        padding: compact ? "10px 12px" : "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: compact && !isSidebar ? "300px" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            backgroundColor: iconBackground,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <Wallet size={17} />
        </div>

        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: textColor }}>
            Wallet required
          </div>
          <div style={{ fontSize: "12px", color: mutedColor }}>
            Connect to create notes.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {wallets.length > 1 && (
          <select
            value={selectedWalletId}
            onChange={(event) => setSelectedWalletId(event.target.value)}
            disabled={isConnecting}
            style={{
              border: `1px solid ${panelBorder}`,
              borderRadius: "8px",
              backgroundColor: isSidebar ? "#2E241D" : "#FFFFFF",
              color: textColor,
              fontSize: "13px",
              padding: "9px 10px",
              minWidth: 0,
              flex: 1,
            }}
          >
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() =>
            void onConnect(selectedWalletId || wallets[0]?.id).catch(() => undefined)
          }
          disabled={isConnecting || wallets.length === 0}
          style={{
            border: "none",
            borderRadius: "8px",
            backgroundColor: wallets.length === 0 ? disabledBackground : actionBackground,
            color: actionColor,
            fontSize: "13px",
            fontWeight: 700,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: isConnecting || wallets.length === 0 ? "not-allowed" : "pointer",
            flex: wallets.length > 1 ? "0 0 auto" : 1,
          }}
        >
          {isConnecting ? <Loader2 size={15} className="animate-spin" /> : <Wallet size={15} />}
          Connect wallet
        </button>
      </div>

      {(error || wallets.length === 0) && (
        <div
          role="alert"
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "flex-start",
            color: isSidebar ? "#FCA5A5" : "#991B1B",
            backgroundColor: isSidebar ? "rgba(239, 68, 68, 0.16)" : "#FEE2E2",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "12px",
            lineHeight: 1.4,
          }}
        >
          <AlertCircle
            size={14}
            style={{
              color: isSidebar ? "#FCA5A5" : "#991B1B",
              flex: "0 0 auto",
              marginTop: "1px",
            }}
          />
          <span>
            {error || "No Cardano browser wallet was detected in this browser."}
          </span>
        </div>
      )}
    </div>
  );
}

export function formatWalletAddress(address: string) {
  if (!address) {
    return "No address";
  }

  if (address.length <= 24) {
    return address;
  }

  return `${address.slice(0, 12)}...${address.slice(-10)}`;
}

function WalletIcon({
  wallet,
  variant,
}: {
  wallet: WalletOption;
  variant: "default" | "sidebar";
}) {
  if (wallet.icon) {
    return (
      <img
        src={wallet.icon}
        alt=""
        style={{ width: "34px", height: "34px", borderRadius: "8px", flex: "0 0 auto" }}
      />
    );
  }

  return (
    <div
      style={{
        width: "34px",
        height: "34px",
        borderRadius: "8px",
        backgroundColor: variant === "sidebar" ? "rgba(245, 165, 102, 0.14)" : "#F3EFEA",
        color: variant === "sidebar" ? "var(--accent-orange)" : "#6E5A47",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      <Wallet size={17} />
    </div>
  );
}
