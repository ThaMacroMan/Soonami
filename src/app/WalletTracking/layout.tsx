"use client";
import { ReactNode } from 'react';
import Link from 'next/link';

interface WalletLayoutProps {
  children: ReactNode;
}

export default function WalletLayout({ children }: WalletLayoutProps) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-[#0A0B2E] via-[#2B076E] to-[#0A0B2E]">
      {/* Background effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,56,255,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,0,255,0.15),transparent_50%)]"></div>
      </div>

      {/* Content container - removed h-full */}
      <div className="relative z-10 flex flex-col backdrop-blur-[2px]">
        {/* Glass effect header */}
        <header className="sticky top-0 z-50 bg-[#0A0B2E]/20 backdrop-blur-md border-b border-blue-500/20">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 text-transparent bg-clip-text tracking-widest hover:scale-105 transition-transform cursor-pointer">
                SOONAMI
              </h1>
            </Link>
            
            {/* Optional: Add navigation or other header elements here */}
          </div>
        </header>

        {/* Main content area - removed flex-1 */}
        <main className="container mx-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
} 