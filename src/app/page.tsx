"use client";
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-scene min-h-screen relative overflow-hidden">
      {/* Title */}
      <div className="absolute w-full text-center pt-16">
        <h1 className="text-6xl font-extrabold text-white tracking-wider drop-shadow-lg">
          SOONAMI
        </h1>
      </div>

      {/* Dropdown Container */}
      <div className="absolute inset-0 flex items-center justify-center mt-68">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-8 py-4 bg-black hover:bg-gray-900 text-white rounded-lg text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 border-2 border-blue-500"
          >
            Click here to see the Whales
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute mt-2 w-full bg-black border-2 border-blue-500 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <Link href="/WhaleWatching">
                <div className="px-4 py-3 text-white hover:bg-gray-900 cursor-pointer transition-colors">
                  Solar System
                </div>
              </Link>
              <Link href="/TokenTracking">
                <div className="px-4 py-3 text-white hover:bg-gray-900 cursor-pointer transition-colors">
                  Token Tracking
                </div>
              </Link>
              <Link href="/WalletTracking">
                <div className="px-4 py-3 text-white hover:bg-gray-900 cursor-pointer transition-colors">
                  Wallet Tracking
                </div>
              </Link>
              <Link href="/TokenRacing">
                <div className="px-4 py-3 text-white hover:bg-gray-900 cursor-pointer transition-colors">
                  Token Racing
                </div>
              </Link>
              <Link href="/CardanoViewer">
                <div className="px-4 py-3 text-white hover:bg-gray-900 cursor-pointer transition-colors">
                  Cardano Viewer - Logo Organized
                </div>
              </Link>
              <Link href="#">
                <div className="px-4 py-3 text-white hover:bg-gray-900 cursor-pointer transition-colors">
                  UNKNOWN
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .space-scene {
          background-image: url('/Whale1.webp');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          width: 100%;
          height: 100vh;
        }
      `}</style>
    </div>
  );
}
