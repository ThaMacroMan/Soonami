"use client";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import Link from "next/link";
import { useState } from "react";

export const walletOptions = [
  {label: "Whale1", key: "whale1", description: "Whale Address 1"},
  {label: "Whale2", key: "whale2", description: "Whale Address 2"},
  {label: "Whale3", key: "whale3", description: "Whale Address 3"},
  {label: "Whale4", key: "whale4", description: "Whale Address 4"},
  {label: "Whale5", key: "whale5", description: "Whale Address 5"},
  {label: "ALL", key: "all", description: "All"},
];

export const tokenOptions = [
  {label: "WMT", key: "wmt", description: "World Mobile Token"},
  {label: "LQ", key: "lq", description: "Liqwid Token"},
  {label: "SNEK", key: "snek", description: "Snek Token"},
  {label: "IAG", key: "iag", description: "IAG Token"},
  {label: "VIPER", key: "viper", description: "Viper Token"},
  {label: "ALL", key: "all", description: "All"},
];

export const methodOptions = [
  {label: "Profitability", key: "profitability", description: "Sort by Profitability"},
  {label: "Age", key: "age", description: "Sort by Age"},
  {label: "Activity", key: "activity", description: "Sort by Activity"},
  {label: "Value", key: "value", description: "Sort by Value"},
  {label: "Volume", key: "volume", description: "Sort by Volume"},
];

export default function WalletTracking() {
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleWalletSelection = (option: any) => {
    if (option.key === 'all') {
      setSelectedWallet('all');
    } else {
      setSelectedWallet(option.key);
    }
    console.log('Wallet selected:', option.key); // Debug log
  };

  const handleTokenSelection = (option: any) => {
    if (option.key === 'all') {
      const allTokens = tokenOptions
        .filter(token => token.key !== 'all')
        .map(token => token.key);
      setSelectedTokens(allTokens);
    } else {
      setSelectedTokens([option.key]);
    }
    console.log('Tokens selected:', option.key); // Debug log
  };

  const handleMethodSelection = (option: any) => {
    setSelectedMethod(option.key);
    console.log('Method selected:', option.key); // Debug log
  };

  const isSubmitEnabled = Boolean(selectedWallet) && 
    selectedTokens.length > 0 && 
    Boolean(selectedMethod);

  console.log('States:', { selectedWallet, selectedTokens, selectedMethod, isSubmitEnabled }); // Debug log

  const handleSubmit = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Header */}
      <header className="relative z-10 p-6">
        <Link href="/">
          <h1 className="text-4xl font-bold text-white tracking-widest cursor-pointer hover:text-blue-500 transition-colors">
            SOONAMI
          </h1>
        </Link>
      </header>

      {/* Main container */}
      <div className="relative z-10 flex justify-center items-center min-h-[80vh]">
        <div className="grid grid-cols-1 gap-6 p-8 bg-black/40 backdrop-blur-lg rounded-xl border border-blue-500/30 max-w-2xl w-1/2">
          <div className="relative">
            <div className="text-blue-500 mb-2">Whale Wallet</div>
            <Autocomplete
              className="w-full bg-transparent text-blue-500"
              defaultItems={walletOptions}
              placeholder="Select wallet"
              onSelectionChange={(key) => handleWalletSelection({ key })}
            >
              {(option) => (
                <AutocompleteItem 
                  key={option.key} 
                  className="text-blue-500 hover:bg-blue-900/40 bg-black"
                >
                  {option.label}
                </AutocompleteItem>
              )}
            </Autocomplete>
          </div>

          <div className="relative">
            <div className="text-blue-500 mb-2">Tokens</div>
            <Autocomplete
              className="w-full bg-transparent text-blue-500"
              defaultItems={tokenOptions}
              placeholder="Select token"
              onSelectionChange={(key) => handleTokenSelection({ key })}
            >
              {(option) => (
                <AutocompleteItem 
                  key={option.key} 
                  className="text-blue-500 hover:bg-blue-900/40 bg-black"
                >
                  {option.label}
                </AutocompleteItem>
              )}
            </Autocomplete>
          </div>

          <div className="relative">
            <div className="text-blue-500 mb-2">Method of Organizing</div>
            <Autocomplete
              className="w-full bg-transparent text-blue-500"
              defaultItems={methodOptions}
              placeholder="Select method"
              onSelectionChange={(key) => handleMethodSelection({ key })}
            >
              {(option) => (
                <AutocompleteItem 
                  key={option.key} 
                  className="text-blue-500 hover:bg-blue-900/40 bg-black"
                >
                  {option.label}
                </AutocompleteItem>
              )}
            </Autocomplete>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-4">
            <button 
              onClick={handleSubmit}
              disabled={!isSubmitEnabled}
              className={`px-6 py-2 rounded-lg transition-all duration-300 transform 
              ${isSubmitEnabled 
                ? 'bg-blue-500 hover:bg-blue-600 hover:scale-105 text-white' 
                : 'bg-gray-500 cursor-not-allowed text-gray-300'}`}
            >
              Submit
            </button>
          </div>
        </div>
      </div>

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black w-1/2 h-3/4 p-8 rounded-xl border-2 border-blue-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-blue-500">Selected Options</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:text-blue-500"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-white">
              <p><span className="text-blue-500">Selected Wallet:</span> {selectedWallet}</p>
              <p><span className="text-blue-500">Selected Tokens:</span> {selectedTokens.join(', ')}</p>
              <p><span className="text-blue-500">Organization Method:</span> {selectedMethod}</p>
              
              {/* Scrollable Container */}
              <div className="w-full h-[300px] border border-blue-500/30 rounded-lg overflow-y-auto mt-4">
                {/* Column Headers */}
                <div className="grid grid-cols-5 gap-4 p-4 border-b border-blue-500/30 sticky top-0 bg-black">
                  <div className="text-blue-500 font-bold">Addr</div>
                  <div className="text-blue-500 font-bold">Token</div>
                  <div className="text-blue-500 font-bold">Amount</div>
                  <div className="text-blue-500 font-bold">BUY/SELL</div>
                  <div className="text-blue-500 font-bold">PNL</div>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  {/* Sample row */}
                  <div className="grid grid-cols-5 gap-4 mb-2">
                    <div>addr1...</div>
                    <div>WMT</div>
                    <div>1000</div>
                    <div>BUY</div>
                    <div>+10%</div>
                  </div>
                  {/* More sample rows */}
                  <div className="grid grid-cols-5 gap-4 mb-2">
                    <div>addr2...</div>
                    <div>LQ</div>
                    <div>500</div>
                    <div>SELL</div>
                    <div>-5%</div>
                  </div>
                  {/* Add more rows as needed */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
