"use client";
import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';

export default function Home() {
  const [showCards, setShowCards] = useState(false);

  const navigationCards = [
    {
      title: "Wallet Tracking",
      description: "Track any token transactions and monitor whale movements",
      link: "/WalletTracking",
      gradient: "from-purple-500/20 to-blue-500/20"
    },
    {
      title: "Cardano Solar System",
      description: "Deep dive into wallet behaviors and trading patterns",
      link: "/Solar",
      gradient: "from-blue-500/20 to-purple-500/20"
    },
    {
      title: "Cardano Beam transaction Viwer",
      description: "Explore token holder distributions and concentrations",
      link: "/Beam",
      gradient: "from-purple-500/20 to-blue-500/20"
    }
  ];

  return (
    <div className="space-scene min-h-screen relative overflow-hidden">
      {/* Title */}
      <div className="absolute w-full text-center pt-16">
        <h1 className="text-6xl font-extrabold text-white tracking-wider drop-shadow-lg">
          SOONAMI
        </h1>
      </div>

      {/* Button and Cards Container */}
      <div className="absolute inset-0 flex items-center justify-center mt-68">
        <div className="text-center space-y-8">
          <button
            onClick={() => setShowCards(true)}
            className="px-8 py-4 bg-black hover:bg-gray-900 text-white rounded-lg text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 border-2 border-blue-500"
          >
            Click here to see the Whales
          </button>

          {/* Navigation Cards */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto transition-all duration-500 ${
            showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
          }`}>
            {navigationCards.map((card, index) => (
              <Link 
                key={index}
                href={card.link}
                className="group relative overflow-hidden rounded-2xl border border-purple-500/30 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
                <div className="relative h-[200px] p-6 flex flex-col justify-end">
                  <h3 className="text-2xl font-bold text-purple-400 mb-2">
                    {card.title}
                  </h3>
                  <p className="text-purple-300/80">
                    {card.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
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
