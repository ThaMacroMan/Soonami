"use client";
import Link from "next/link";

export default function CardanoViewer() {
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
    </div>
  );
}
