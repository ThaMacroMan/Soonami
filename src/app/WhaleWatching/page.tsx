'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Container, Typography, Button, List, ListItem, ListItemButton, ListItemText, Dialog, DialogTitle, DialogContent, Box, CircularProgress, Fade } from '@mui/material'
import WalletConnectors from '../components/WalletConnectors'
import { Wallet } from '../types/cardano'
import Link from 'next/link'
import tokenList from '../../algos/data/token_list.json'
import { WhaleWatcher } from '../../algos'
import { Terminal, AnimatedSpan } from '../../components/magicui/terminal'
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

function LiveTradeStream({ solarTokens, onNewTrade }: { solarTokens: any[], onNewTrade?: (trade: any) => void }) {
  const [trades, setTrades] = useState<any[]>([]);
  const [isHidden, setIsHidden] = useState(false);
  const whaleWatcher = new WhaleWatcher(process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '');
  const tradesRef = useRef<HTMLDivElement>(null);
  const lastTradeTimeRef = useRef<number>(Date.now() / 1000 - 3600); // Start from 1 hour ago
  const autoScrollRef = useRef<boolean>(true);
  const scrollPositionRef = useRef<number>(0);
  const tradeQueueRef = useRef<any[]>([]);
  const processingTradesRef = useRef<boolean>(false);

  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Process trades one by one
  const processNextTrade = async () => {
    if (processingTradesRef.current || tradeQueueRef.current.length === 0) return;
    
    processingTradesRef.current = true;
    const trade = tradeQueueRef.current.shift();
    
    if (trade) {
      console.log("Processing trade:", trade); // Debug log

      // Pass through the trade with its original action from the API
      const tradeWithToken = {
        ...trade,
        token: trade.token
      };

      // Call onNewTrade with the API's action
      onNewTrade?.(tradeWithToken);

      // Check if trade already exists to prevent duplicates
      setTrades(prevTrades => {
        if (prevTrades.some(t => t.hash === trade.hash && t.time === trade.time)) {
          return prevTrades;
        }
        return [{ ...tradeWithToken, isNew: true }, ...prevTrades].slice(0, 100);
      });

      // Auto-scroll to top if enabled
      if (autoScrollRef.current && tradesRef.current) {
        tradesRef.current.scrollTop = 0;
      }

      // Remove the isNew flag after animation completes
      setTimeout(() => {
        setTrades(prevTrades => 
          prevTrades.map((t, i) => 
            i === 0 ? { ...t, isNew: false } : t
          )
        );
      }, 2000);

      // Wait for animation to complete before processing next trade
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    processingTradesRef.current = false;
    // Process next trade if queue is not empty
    if (tradeQueueRef.current.length > 0) {
      processNextTrade();
    }
  };

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        // Create a Set of token units for faster lookup
        const visibleTokenUnits = new Set(solarTokens.map(token => token.unit));
        
        // Fetch trades for all visible tokens in parallel
        const newTradesPromises = solarTokens.map(async token => {
          try {
            const trades = await whaleWatcher.getTrades(token.unit);
            return trades
              .filter(trade => trade.time > lastTradeTimeRef.current)
              .map(trade => ({ ...trade, token }));
          } catch (error) {
            console.error(`Error fetching trades for ${token.ticker}:`, error);
            return [];
          }
        });

        const newTradesArrays = await Promise.all(newTradesPromises);
        const allNewTrades = newTradesArrays
          .flat()
          .sort((a, b) => a.time - b.time); // Sort oldest first for processing order

        if (allNewTrades.length > 0) {
          lastTradeTimeRef.current = Math.max(...allNewTrades.map(t => t.time));
          
          // Add new trades to the queue in chronological order (oldest first)
          tradeQueueRef.current.push(...allNewTrades);
          
          // Start processing if not already processing
          if (!processingTradesRef.current) {
            processNextTrade();
          }
        }
      } catch (error) {
        console.error('Error fetching trades:', error);
      }
    };

    // Clear trades when solarTokens changes
    setTrades([]);
    tradeQueueRef.current = [];
    lastTradeTimeRef.current = Date.now() / 1000 - 3600; // Reset to 1 hour ago
    processingTradesRef.current = false;

    // Initial fetch
    fetchTrades();

    // Set up interval for fetching trades every minute
    const interval = setInterval(fetchTrades, 60000);
    return () => clearInterval(interval);
  }, [solarTokens, onNewTrade]);

  // Auto-scroll effect
  useEffect(() => {
    const scrollContainer = tradesRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      scrollPositionRef.current = scrollContainer.scrollTop;
      // Only auto-scroll if we're near the top
      autoScrollRef.current = scrollPositionRef.current < 50;
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Terminal 
      className={`!max-h-none w-[300px] h-screen fixed transition-transform duration-300 ease-in-out ${isHidden ? 'translate-x-[calc(100%-48px)]' : 'translate-x-0'} right-0 top-0 bg-zinc-900/90 backdrop-blur-sm overflow-hidden border-l border-zinc-800`}
      onToggle={() => setIsHidden(!isHidden)}
    >
      <div className="h-[100vh] flex flex-col">
        <AnimatedSpan className="text-green-400 font-mono text-lg sticky top-0 bg-zinc-900/95 backdrop-blur-sm p-4 border-b border-zinc-800 z-10">
          Live Token Trades
        </AnimatedSpan>
        <div 
          ref={tradesRef} 
          className="flex-1 overflow-y-auto p-4 space-y-2 h-full scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
          onMouseEnter={() => autoScrollRef.current = false}
          onMouseLeave={() => autoScrollRef.current = true}
        >
          {trades.map((trade, index) => (
            trade.isNew ? (
              <AnimatedSpan
                key={`${trade.hash}-${trade.time}-${index}`}
                delay={0}
                className="font-mono block"
              >
                <div 
                  className={`p-3 rounded bg-zinc-900/50 border border-zinc-800 
                    ${trade.action === 'buy' ? 'text-green-400' : 'text-red-400'} text-sm new-trade-flash ${trade.action === 'buy' ? 'buy-flash' : 'sell-flash'} cursor-pointer hover:bg-zinc-800/50 transition-colors`}
                  onClick={() => window.open(`https://cardanoscan.io/transaction/${trade.hash}`, '_blank')}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{trade.token.ticker}</span>
                    <span className="opacity-75">{new Date(trade.time * 1000).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span>{formatNumber(Math.abs(trade.tokenAAmount))} tokens</span>
                    <span>₳{formatNumber(Math.abs(trade.tokenAAmount * trade.price))}</span>
                  </div>
                  <div className="text-xs opacity-50 mt-1 hover:opacity-100 transition-opacity">
                    {trade.hash.slice(0, 8)}...{trade.hash.slice(-8)} ↗
                  </div>
                </div>
              </AnimatedSpan>
            ) : (
              <div
                key={`${trade.hash}-${trade.time}-${index}`}
                className="font-mono block"
              >
                <div 
                  className={`p-3 rounded bg-zinc-900/50 border border-zinc-800 
                    ${trade.action === 'buy' ? 'text-green-400' : 'text-red-400'} text-sm cursor-pointer hover:bg-zinc-800/50 transition-colors`}
                  onClick={() => window.open(`https://cardanoscan.io/transaction/${trade.hash}`, '_blank')}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{trade.token.ticker}</span>
                    <span className="opacity-75">{new Date(trade.time * 1000).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span>{formatNumber(Math.abs(trade.tokenAAmount))} tokens</span>
                    <span>₳{formatNumber(Math.abs(trade.tokenAAmount * trade.price))}</span>
                  </div>
                  <div className="text-xs opacity-50 mt-1 hover:opacity-100 transition-opacity">
                    {trade.hash.slice(0, 8)}...{trade.hash.slice(-8)} ↗
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
      <style jsx global>{`
        .terminal-container {
          max-height: none !important;
          height: 100vh !important;
        }
        .terminal-content {
          height: calc(100vh - 4rem) !important;
        }
        @keyframes buy-flash {
          0% { background-color: rgba(52, 211, 153, 0.3); }
          50% { background-color: rgba(52, 211, 153, 0.1); }
          100% { background-color: rgba(0, 0, 0, 0); }
        }
        @keyframes sell-flash {
          0% { background-color: rgba(239, 68, 68, 0.3); }
          50% { background-color: rgba(239, 68, 68, 0.1); }
          100% { background-color: rgba(0, 0, 0, 0); }
        }
        .new-trade-flash {
          animation-duration: 2s;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
        .buy-flash {
          animation-name: buy-flash;
        }
        .sell-flash {
          animation-name: sell-flash;
        }
        
        /* Custom Scrollbar Styles */
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgba(161, 161, 170, 0.3);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: rgba(161, 161, 170, 0.5);
        }
      `}</style>
    </Terminal>
  );
}

function SolarSystemTokens({ tokens, onSelectToken }: { tokens: any[], onSelectToken: (token: any) => void }) {
  const [tokenCount, setTokenCount] = useState(20);
  const [showLabels, setShowLabels] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const whaleWatcher = new WhaleWatcher(process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '');
  const tradeVolumeRef = useRef<{ [key: string]: number }>({});
  const baseOrbitSpeedRef = useRef<{ [key: string]: number }>({});
  const planetsRef = useRef<any[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const explosionsRef = useRef<Array<{
    particles: THREE.Points,
    startTime: number,
    duration: number,
    velocity: THREE.Vector3[],
    planet: any,
    distanceScale: number
  }>>([]);
  const flashingPlanetsRef = useRef<Map<string, { color: THREE.Color, endTime: number }>>(new Map());

  const createExplosion = (
    planet: any, 
    color: THREE.Color, 
    camera: THREE.PerspectiveCamera,
    particleCount: number = 300, // Reduced base particle count
    sizeMultiplier: number = 1
  ) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];
    
    // Start all particles from planet position
    const planetPos = new THREE.Vector3();
    planet.mesh.getWorldPosition(planetPos);
    
    // Calculate distance from camera to planet for scaling
    const cameraDistance = camera.position.distanceTo(planetPos);
    const distanceScale = Math.max(1, cameraDistance / 50);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = planetPos.x;
      positions[i * 3 + 1] = planetPos.y;
      positions[i * 3 + 2] = planetPos.z;
      
      // Create more elegant directional explosion
      const angle = (i / particleCount) * Math.PI * 20;
      const heightFactor = Math.sin((i / particleCount) * Math.PI); // Creates wave-like pattern
      const radius = (0.3 + Math.random() * 0.7) * distanceScale * sizeMultiplier; // More controlled radius
      
      // Add slight spiral effect
      const spiralFactor = (i / particleCount) * Math.PI * 2;
      const upwardBias = (Math.random() - 0.5) * distanceScale * sizeMultiplier * 0.2;
      
      const velocity = new THREE.Vector3(
        Math.cos(angle + spiralFactor) * radius,
        upwardBias + heightFactor * distanceScale * sizeMultiplier * 0.3,
        Math.sin(angle + spiralFactor) * radius
      ).normalize().multiplyScalar(0.3 + Math.random() * 0.4 * distanceScale * sizeMultiplier);
      
      velocities.push(velocity);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.08 * distanceScale * Math.sqrt(sizeMultiplier), // Smaller base particle size
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    const particles = new THREE.Points(geometry, material);
    return { particles, velocities, distanceScale };
  };

  const handleNewTrade = (trade: any) => {
    console.log("New trade received:", trade);
    const planet = planetsRef.current.find(p => p.token.unit === trade.token.unit);
    if (!planet || !sceneRef.current || !cameraRef.current) {
      console.log("Planet, scene, or camera not found", trade.token.unit);
      return;
    }

    const isBuy = trade.action === 'buy';
    console.log("Trade action:", trade.action, "Amount:", trade.tokenAAmount);
    
    const flashColor = isBuy ? 
      new THREE.Color(0x00ff66) : 
      new THREE.Color(0xff3333);

    flashingPlanetsRef.current.set(trade.token.unit, {
      color: flashColor,
      endTime: Date.now() + 2000
    });

    // Calculate explosion size based on ADA value with logarithmic scaling
    const tradeValue = Math.abs(trade.tokenAAmount * trade.price);
    const baseSize = 200; // Reduced base particle count
    const sizeMultiplier = Math.min(3, Math.max(0.5, Math.log10(tradeValue) / 2));
    const particleCount = Math.floor(baseSize * sizeMultiplier);

    console.log(`Trade value: ₳${tradeValue}, Size multiplier: ${sizeMultiplier}, Particles: ${particleCount}`);

    // Create fewer waves for small trades, more for large ones
    const waveCount = Math.min(3, Math.max(1, Math.floor(sizeMultiplier)));
    
    for (let i = 0; i < waveCount; i++) {
      setTimeout(() => {
        if (!sceneRef.current || !cameraRef.current) return;

        const { particles, velocities, distanceScale } = createExplosion(
          planet, 
          flashColor, 
          cameraRef.current,
          particleCount,
          sizeMultiplier
        );

        const material = particles.material as THREE.PointsMaterial;
        material.opacity = 0.8;

        sceneRef.current.add(particles);
        explosionsRef.current.push({
          particles,
          startTime: Date.now(),
          duration: 1500 + (500 * sizeMultiplier), // Duration scales with size
          velocity: velocities,
          planet,
          distanceScale
        });
      }, i * 200); // Slightly longer delay between waves
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x000000);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 40, 70);
    scene.add(camera); // Add camera to scene
    cameraRef.current = camera; // Store camera reference

    // Add stars to background
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 10000;
    const starsPositions = new Float32Array(starCount * 3);
    const starsSizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Random position in sphere
      const radius = Math.random() * 400 + 100; // Between 100 and 500 units
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      starsPositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      starsPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starsPositions[i3 + 2] = radius * Math.cos(phi);
      
      // Random sizes for twinkling effect
      starsSizes[i] = Math.random() * 2;
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(starsSizes, 1));
    
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // Main renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Label renderer setup
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.width = '100%';
    labelRenderer.domElement.style.height = '100%';
    labelRenderer.domElement.style.pointerEvents = 'none';
    labelRenderer.domElement.style.zIndex = '1';
    containerRef.current.appendChild(labelRenderer.domElement);

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 500; // Increased from 200 to 500
    controls.maxPolarAngle = Math.PI * 0.85; // Limit vertical rotation slightly

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    const sunLight = new THREE.PointLight(0xffffff, 1.2, 300);
    scene.add(sunLight);

    // Sun setup with updated size and color
    const sunScale = 6;
    const sunGeometry = new THREE.SphereGeometry(sunScale, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0066ff, // Changed to blue
      emissive: 0x0044cc, // Matching blue emissive
      emissiveIntensity: 0.8
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sunMesh);
    sunLight.position.copy(sunMesh.position);

    // Update sun label creation
    const sunDiv = document.createElement('div');
    sunDiv.className = 'text-white text-2xl font-bold pointer-events-none select-none bg-black/50 px-3 py-1 rounded-full';
    sunDiv.textContent = 'Cardano';
    const sunLabel = new CSS2DObject(sunDiv);
    sunLabel.position.set(0, 0, 0);
    sunMesh.add(sunLabel);

    const orbitsGroup = new THREE.Group();
    scene.add(orbitsGroup);

    function createOrbitPath(radius: number) {
      const segments = 128;
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.3 });
      return new THREE.Line(geometry, material);
    }

    // Calculate size range based on liquidity
    const liquidities = tokens.map(t => t.liquidity);
    const maxLiquidity = Math.max(...liquidities);
    const minLiquidity = Math.min(...liquidities);
    const normalizeSize = (liquidity: number) => {
      // Use logarithmic scale for better size distribution
      const logLiquidity = Math.log(liquidity);
      const logMin = Math.log(minLiquidity);
      const logMax = Math.log(maxLiquidity);
      const normalized = (logLiquidity - logMin) / (logMax - logMin);
      return 0.75 + (4 * normalized); // Scale from 0.75 to 4.75
    };

    const formatLiquidity = (liquidity: number) => {
      if (liquidity >= 1e6) {
        return `$${(liquidity / 1e6).toFixed(1)}M`;
      } else if (liquidity >= 1e3) {
        return `$${(liquidity / 1e3).toFixed(1)}K`;
      }
      return `$${liquidity.toFixed(1)}`;
    };

    const planets: any[] = [];
    const baseDistance = 12;
    const spacing = 6;
    
    const sortedTokens = tokens
      .slice(0, tokenCount)
      .sort((a, b) => b.liquidity - a.liquidity);

    // Initialize base speeds for each token
    sortedTokens.forEach((token, index) => {
      baseOrbitSpeedRef.current[token.unit] = 0.0001 + (0.0001 * (20 - index));
      tradeVolumeRef.current[token.unit] = 0;
    });

    sortedTokens.forEach((token, index) => {
      const distance = baseDistance + index * spacing;
      const size = normalizeSize(token.liquidity);
      const orbitSpeed = baseOrbitSpeedRef.current[token.unit];
      const rotationSpeed = 0.005;
      
      // Create color based on liquidity value
      const hue = 0.6 - (index / sortedTokens.length) * 0.5; // Blue to purple gradient
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6);

      const orbitPath = createOrbitPath(distance);
      orbitsGroup.add(orbitPath);

      const pivot = new THREE.Object3D();
      orbitsGroup.add(pivot);
      
      // Create a group to hold both the orb and its label
      const orbGroup = new THREE.Group();
      
      // Create the orb mesh
      const geometry = new THREE.SphereGeometry(size, 32, 32);
      const material = new THREE.MeshPhongMaterial({ 
        color: color,
        shininess: 30,
        emissive: color.clone().multiplyScalar(0.3),
        emissiveIntensity: 0.5
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Store original material color for flashing effect
      mesh.userData.originalColor = color.clone();
      
      // Create label element with improved styling
      const labelDiv = document.createElement('div');
      const labelSize = '8px';
      labelDiv.style.fontSize = labelSize;
      labelDiv.style.fontWeight = 'bold';
      labelDiv.style.color = 'white';
      labelDiv.style.padding = '4px 6px';
      labelDiv.style.background = 'rgba(0, 0, 0, 0.5)';
      labelDiv.style.borderRadius = '16px';
      labelDiv.style.textAlign = 'center';
      labelDiv.style.whiteSpace = 'nowrap';
      labelDiv.style.transition = 'opacity 0.3s';
      labelDiv.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
      labelDiv.style.transform = 'translate(-50%, -50%)';
      labelDiv.textContent = token.ticker;
      
      // Create CSS2D object for label
      const label = new CSS2DObject(labelDiv);
      label.position.set(0, size * 1.2, 0); // Position above the orb
      
      // Add mesh and label to the group
      orbGroup.add(mesh);
      orbGroup.add(label);
      
      // Position the entire group
      orbGroup.position.set(distance, 0, 0);
      pivot.add(orbGroup);

      planets.push({ 
        token, 
        pivot, 
        mesh, 
        orbitSpeed, 
        rotationSpeed, 
        size,
        label,
        orbGroup 
      });
    });

    // Store planets reference for flashing effect
    planetsRef.current = planets;

    function animate() {
      requestAnimationFrame(animate);
      controls.update();

      // Update explosions
      const now = Date.now();
      explosionsRef.current = explosionsRef.current.filter(explosion => {
        const age = now - explosion.startTime;
        if (age > explosion.duration) {
          scene.remove(explosion.particles);
          return false;
        }

        const progress = age / explosion.duration;
        const positions = explosion.particles.geometry.attributes.position.array as Float32Array;
        const planetPos = new THREE.Vector3();
        explosion.planet.mesh.getWorldPosition(planetPos);

        const currentDistance = camera.position.distanceTo(planetPos);
        const currentDistanceScale = Math.max(1, currentDistance / 50);
        
        (explosion.particles.material as THREE.PointsMaterial).size = 0.5 * currentDistanceScale;

        for (let i = 0; i < positions.length; i += 3) {
          const velocity = explosion.velocity[i / 3];
          const particleAge = age * 0.012;
          const expansionFactor = Math.min(particleAge * 0.4, 1);
          
          const movementScale = currentDistanceScale / explosion.distanceScale;

          positions[i] = planetPos.x + velocity.x * particleAge * (1 + expansionFactor) * movementScale;
          positions[i + 1] = planetPos.y + velocity.y * particleAge * (1 + expansionFactor) * movementScale + 
                            Math.sin(particleAge * 1.5 + i) * 0.3 * currentDistanceScale;
          positions[i + 2] = planetPos.z + velocity.z * particleAge * (1 + expansionFactor) * movementScale;
        }

        explosion.particles.geometry.attributes.position.needsUpdate = true;
        
        const fadeProgress = 1 - progress;
        const pulseEffect = 0.8 + Math.sin(age * 0.008) * 0.4;
        (explosion.particles.material as THREE.PointsMaterial).opacity = fadeProgress * pulseEffect;

        return true;
      });

      // Update planet colors and handle flashing effects
      planets.forEach(planet => {
        const flash = flashingPlanetsRef.current.get(planet.token.unit);
        const material = planet.mesh.material as THREE.MeshPhongMaterial;

        if (flash && now < flash.endTime) {
          // During flash
          const progress = (flash.endTime - now) / 1000;
          material.color.copy(flash.color).multiplyScalar(progress)
            .add(planet.mesh.userData.originalColor.clone().multiplyScalar(1 - progress));
          material.emissive.copy(flash.color).multiplyScalar(progress * 0.5);
        } else if (flash) {
          // Flash ended
          flashingPlanetsRef.current.delete(planet.token.unit);
          material.color.copy(planet.mesh.userData.originalColor);
          material.emissive.copy(planet.mesh.userData.originalColor).multiplyScalar(0.3);
        }

        // Update rotation for the entire group
        planet.pivot.rotation.y += (planet.currentOrbitSpeed || planet.orbitSpeed);
        planet.orbGroup.rotation.y += planet.rotationSpeed;

        // Update label visibility
        if (planet.label && planet.label.element) {
          planet.label.element.style.opacity = showLabels ? '1' : '0';
        }
      });

      // Update sun label to face camera
      if (sunMesh && sunMesh.children[0]) {
        sunMesh.children[0].quaternion.copy(camera.quaternion);
      }

      // Render scene and labels
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }
    animate();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    function onClick(event: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const planet = planets.find(p => p.mesh === clickedMesh);
        if (planet) {
          onSelectToken(planet.token);
        }
      }
    }
    renderer.domElement.addEventListener('click', onClick);

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onWindowResize);

    return () => {
      renderer.domElement.removeEventListener('click', onClick);
      window.removeEventListener('resize', onWindowResize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
        containerRef.current.removeChild(labelRenderer.domElement);
      }
      sceneRef.current = null;
    };
  }, [tokens, onSelectToken, tokenCount, showLabels]);

  return (
    <>
      <div className="absolute top-4 left-36 flex items-center gap-4 z-10">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-2 flex items-center gap-2">
          <label className="text-white text-sm">Tokens:</label>
          <input
            type="number"
            min="1"
            max={tokens.length}
            value={tokenCount}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 1;
              setTokenCount(Math.min(Math.max(1, newValue), tokens.length));
            }}
            className="w-20 bg-zinc-800 text-white rounded px-2 py-1 text-sm"
          />
          <span className="text-zinc-400 text-xs">/ {tokens.length}</span>
          <button
            onClick={() => setTokenCount(tokens.length)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors ml-2"
          >
            Show All
          </button>
        </div>
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-2">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className="text-sm text-white hover:text-blue-300 transition-colors flex items-center gap-2 pointer-events-auto"
          >
            <span className={showLabels ? 'text-blue-400' : 'text-zinc-400'}>
              {showLabels ? 'Hide Labels' : 'Show Labels'}
            </span>
          </button>
        </div>
      </div>
      <div ref={containerRef} className="absolute inset-0" style={{ width: '100vw', height: '100vh' }}>
        <style jsx global>{`
          .text-white {
            color: white;
            text-shadow: 0 0 4px rgba(0,0,0,0.8);
            pointer-events: none;
            transition: all 0.3s ease;
          }
          .token-name {
            font-size: 1.2em;
            font-weight: 800;
          }
          .token-info {
            font-size: 0.9em;
            opacity: 0.9;
          }
          .price {
            color: #90caf9;
          }
          .liquidity {
            color: #81c784;
          }
          .high-volume {
            color: #ffd700;
            text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
            transform: scale(1.1);
          }
        `}</style>
      </div>
      <LiveTradeStream 
        solarTokens={tokens.slice(0, tokenCount).sort((a, b) => b.liquidity - a.liquidity)}
        onNewTrade={handleNewTrade}
      />
    </>
  );
}

export default function WhaleWatchingPage() {
  const [address, setAddress] = useState<string>('')
  const [showTokenList, setShowTokenList] = useState(false)
  const [selectedToken, setSelectedToken] = useState<any>(null)
  const [whaleData, setWhaleData] = useState<any[]>([])
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const tradesRef = useRef<HTMLDivElement>(null)
  const holdersRef = useRef<HTMLDivElement>(null)

  // Initialize WhaleWatcher with API key
  const whaleWatcher = new WhaleWatcher(process.env.NEXT_PUBLIC_TAPTOOLS_API_KEY || '')

  const fetchWhaleData = async (token: any) => {
    setLoading(true)
    
    // Start both fetches in parallel but handle data streaming separately
    const fetchHolders = async () => {
      try {
        const holders = await whaleWatcher.getTopHolders(token.unit)
        // Stream in holders one by one
        holders.forEach((holder, index) => {
          setTimeout(() => {
            setWhaleData(prev => [...prev, holder].slice(0, 50))
          }, index * 100) // Add each holder with 100ms delay
        })
      } catch (error) {
        console.error('Error fetching holders:', error)
      }
    }

    const fetchAndStreamTrades = async () => {
      try {
        const initialTrades = await whaleWatcher.getTrades(token.unit)
        // Stream in trades one by one
        initialTrades.forEach((trade, index) => {
          setTimeout(() => {
            setTrades(prev => [trade, ...prev].slice(0, 50))
          }, index * 100) // Add each trade with 100ms delay
        })

        // Set up periodic trade updates
        const interval = setInterval(async () => {
          const newTrades = await whaleWatcher.getTrades(token.unit)
          // Stream in new trades
          newTrades.forEach((trade, index) => {
            setTimeout(() => {
              setTrades(prev => [trade, ...prev].slice(0, 50))
            }, index * 100)
          })
        }, 30000)

        return interval
      } catch (error) {
        console.error('Error fetching trades:', error)
      }
    }

    // Start both fetches
    let tradeInterval: NodeJS.Timeout | undefined
    Promise.all([
      fetchHolders(),
      fetchAndStreamTrades().then(interval => {
        tradeInterval = interval
      })
    ]).finally(() => {
      setLoading(false)
    })

    // Cleanup function
    return () => {
      if (tradeInterval) clearInterval(tradeInterval)
    }
  }

  const handleTokenSelect = (token: any) => {
    setSelectedToken(token)
    setShowTokenList(false)
    fetchWhaleData(token)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const onConnectWallet = async (wallet: Wallet) => {
    try {
      const api = await wallet.enable()
      const [addr] = await api.getUsedAddresses()
      setAddress(addr)
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined

    if (selectedToken) {
      fetchWhaleData(selectedToken).then(cleanupFn => {
        cleanupFn() // Execute cleanup function but don't assign its result
      })
    }

    return () => {
      setWhaleData([])
      setTrades([])
    }
  }, [selectedToken])

  useEffect(() => {
    // Auto-scroll to bottom when new data arrives
    if (tradesRef.current) {
      tradesRef.current.scrollTop = tradesRef.current.scrollHeight
    }
    if (holdersRef.current) {
      holdersRef.current.scrollTop = holdersRef.current.scrollHeight
    }
  }, [trades, whaleData])

  return (
    <div className="relative min-h-screen bg-black">
      {/* SOONAMI Link - Top Left */}
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Typography 
            variant="h6" 
            className="font-bold hover:text-blue-500 transition-colors"
            sx={{ letterSpacing: '0.1em' }}
          >
            SOONAMI
          </Typography>
        </Link>
      </div>

      {/* Wallet Connection Section - Top Right */}
      <div className="absolute top-4 right-4">
        {!address ? (
          <WalletConnectors onConnectWallet={onConnectWallet} />
        ) : (
          <span className="text-sm text-white/70">
            Connected: {address.slice(0, 8)}...{address.slice(-8)}
          </span>
        )}
      </div>
 
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {!selectedToken ? (
          // Replace Get Started button with SolarSystemTokens simulation
          <SolarSystemTokens tokens={tokenList.tokens} onSelectToken={handleTokenSelect} />
        ) : (
          // Show whale data and trades when token is selected
          <Box sx={{ 
            display: 'flex', 
            gap: 4,
            minHeight: 'calc(100vh - 120px)', 
            mt: 8,
            px: 4,
            maxWidth: '2000px',
            mx: 'auto',
          }}>
            {/* Trades Panel - Now on the left */}
            <Terminal className="flex-1 max-h-[80vh] bg-zinc-900 overflow-hidden">
              <div className="h-full flex flex-col">
                <AnimatedSpan className="text-green-400 font-mono mb-4 text-lg sticky top-0 bg-zinc-900 p-2 z-10">
                  Recent Large Trades
                </AnimatedSpan>
                <div ref={tradesRef} className="flex-1 overflow-auto px-2">
                  {loading ? (
                    <CircularProgress />
                  ) : (
                    trades.map((trade, index) => (
                      <AnimatedSpan 
                        key={`${trade.hash}-${trade.time}-${index}`}
                        delay={index * 300}
                        className="font-mono block"
                      >
                        <div className={`mb-2 p-2 ${trade.action === 'buy' ? 'text-green-400' : 'text-red-400'} whitespace-pre`}>
                          {`> ${trade.action.toUpperCase()}\n  Time: ${formatDate(trade.time)}\n  Amount: ${trade.tokenAAmount.toLocaleString()} ${trade.tokenAName}\n  Price: $${trade.price.toFixed(6)}\n  Tx: ${trade.hash.slice(0, 8)}...${trade.hash.slice(-8)}`}
                        </div>
                      </AnimatedSpan>
                    ))
                  )}
                </div>
              </div>
            </Terminal>

            {/* Whale Data Panel - Now on the right */}
            <Terminal className="flex-1 max-h-[80vh] bg-zinc-900 overflow-hidden">
              <div className="h-full flex flex-col">
                <AnimatedSpan className="text-blue-400 font-mono mb-4 text-lg sticky top-0 bg-zinc-900 p-2 z-10">
                  {`Top Holders - ${selectedToken?.ticker}`}
                </AnimatedSpan>
                <div ref={holdersRef} className="flex-1 overflow-auto px-2">
                  {loading ? (
                    <CircularProgress />
                  ) : (
                    whaleData.map((holder, index) => (
                      <AnimatedSpan 
                        key={`${holder.address}-${index}`}
                        delay={index * 300}
                        className="font-mono block"
                      >
                        <div className="mb-2 p-2 text-white whitespace-pre">
                          {`> Holder #${index + 1} (${holder.percentage?.toFixed(2)}%)\n  Address: ${holder.address.slice(0, 8)}...${holder.address.slice(-8)}\n  Amount: ${holder.amount.toLocaleString()} ${selectedToken.ticker}\n  Value: $${holder.value?.toLocaleString()}`}
                        </div>
                      </AnimatedSpan>
                    ))
                  )}
                </div>
              </div>
            </Terminal>
          </Box>
        )}

        {/* Token List Dialog */}
        <Dialog 
          open={showTokenList} 
          onClose={() => setShowTokenList(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(0,0,0,0.9)',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        >
          <DialogTitle>
            <Typography variant="h6" component="div" className="font-bold">
              Select a Token to Analyze
            </Typography>
          </DialogTitle>
          <DialogContent>
            <List sx={{ maxHeight: '70vh', overflow: 'auto' }}>
              {tokenList.tokens.map((token, index) => (
                <ListItemButton 
                  key={token.unit}
                  onClick={() => handleTokenSelect(token)}
                  sx={{
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.05)'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body1" component="span" className="font-bold flex justify-between items-center">
                        <span>{token.ticker}</span>
                        <span className="text-gray-400">${token.price.toFixed(6)}</span>
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" component="span" className="text-gray-400 flex justify-between items-center">
                        <span>Liquidity: ${token.liquidity.toLocaleString()}</span>
                      </Typography>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </DialogContent>
        </Dialog>
      </Container>
    </div>
  )
}
