import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { Menu, MenuItem } from "@mui/material";
import { Wallet } from "../types/cardano";

export default function WalletConnectors(props: { onConnectWallet: (wallet: Wallet) => Promise<void> }) {
  const { onConnectWallet } = props;
  const [wallets, setWallets] = useState<Wallet[]>();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const wallets: Wallet[] = [];
    const { cardano } = window;

    for (const c in cardano) {
      const wallet = cardano[c];
      if (!wallet.apiVersion) continue;
      wallets.push(wallet);
    }

    wallets.sort((l: Wallet, r: Wallet) => {
      return l.name.toUpperCase() < r.name.toUpperCase() ? -1 : 1;
    });
    setWallets(wallets);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (!wallets) return <span className="uppercase">Browsing Cardano Wallets</span>;
  if (!wallets.length) return <span className="uppercase">No Cardano Wallet</span>;

  return (
    <div>
      <Button
        onClick={handleClick}
        className="bg-gradient-to-tr from-blue-500 to-green-500 text-white shadow-lg"
        variant="contained"
      >
        Connect Wallet
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {wallets.map((wallet) => (
          <MenuItem
            key={wallet.name}
            onClick={() => {
              onConnectWallet(wallet);
              handleClose();
            }}
          >
            <div className="flex items-center gap-2">
              {wallet.icon && <img src={wallet.icon} alt={wallet.name} className="w-6 h-6" />}
              <span>{wallet.name}</span>
            </div>
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
