"use client";
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const analysisTools = [
    {
      title: "Wallet Tracking",
      description: "Track any token transactions and monitor whale movements",
      link: "/WalletTracking",
      gradient: "from-purple-500/20 to-blue-500/20",
      image: "/analysis.png"
    }
  ];

  const visualizers = [
    {
      title: "Cardano Beam transaction Viewer",
      description: "Explore token holder distributions and concentrations",
      link: "/beam",
      gradient: "from-purple-500/20 to-blue-500/20",
      image: "/beam.png"
    },
    {
      title: "Cardano Solar System",
      description: "Deep dive into wallet behaviors and trading patterns",
      link: "/Solar",
      gradient: "from-blue-500/20 to-purple-500/20",
      image: "/solar.png",
      underConstruction: true
    },

  ];

  return (
    <div className="space-scene min-h-screen relative overflow-hidden">
      {/* Title */}
      <div className="absolute w-full text-center pt-16">
        <h1 className="text-6xl font-extrabold text-white tracking-wider drop-shadow-lg">
          SOONAMI
        </h1>
        <p className="text-xl text-purple-300 mt-2 max-w-2xl mx-auto">
          A growing collection of Cardano token analysis tools and visualizers
        </p>
      </div>

      {/* Cards Container */}
      <div className="absolute inset-0 flex items-center justify-center pt-20">
        <div className="text-center space-y-12 max-w-6xl mx-auto px-4">
          {/* Visualizers Section */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Token Visualizers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500">
              {visualizers.map((card, index) => (
                <Link 
                  key={index}
                  href={card.link}
                  className="group relative overflow-hidden rounded-2xl border border-purple-500/30 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                >
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
                  {card.underConstruction && (
                    <>
                      {/* Under Construction Tape - Top Left to Bottom Right */}
                      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-10 pointer-events-none">
                        <div className="absolute top-[15%] -left-[35%] w-[170%] h-14 bg-yellow-400 rotate-[15deg] flex items-center justify-center transform origin-center shadow-md">
                          <p className="text-black font-extrabold text-xl tracking-widest" style={{ letterSpacing: '0.15em', fontFamily: 'system-ui, -apple-system, sans-serif' }}>UNDER CONSTRUCTION</p>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="relative h-[350px] p-6 flex flex-col">
                    <div className="relative h-48 w-48 mx-auto mb-6 overflow-hidden rounded-lg">
                      <Image 
                        src={card.image} 
                        alt={card.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="mt-auto">
                      <h3 className="text-2xl font-bold text-purple-400 mb-2">
                        {card.title}
                      </h3>
                      <p className="text-purple-300/80">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Analysis Tools Section */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Token Analysis Tools</h2>
            <div className="flex justify-center">
              {analysisTools.map((card, index) => (
                <Link 
                  key={index}
                  href={card.link}
                  className="group relative overflow-hidden rounded-2xl border border-purple-500/30 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] max-w-md"
                >
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
                  <div className="relative h-[350px] p-6 flex flex-col">
                    <div className="relative h-48 w-48 mx-auto mb-6 overflow-hidden rounded-lg">
                      <Image 
                        src={card.image} 
                        alt={card.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="mt-auto">
                      <h3 className="text-2xl font-bold text-purple-400 mb-2">
                        {card.title}
                      </h3>
                      <p className="text-purple-300/80">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
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
