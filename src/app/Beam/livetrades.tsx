'use client'

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, ReactElement, useCallback } from 'react'


interface Trade {
  timestamp: number;
  time: number;
  hash: string;
  price: number;
  tokenAAmount: number;
  tokenBAmount: number;
  action: 'buy' | 'sell' | 'add_liquidity' | 'remove_liquidity' | 'zap';
  address: string;
  exchange: string;
  token: any;
}

export interface LiveTradeStreamProps {
  solarTokens: any[];
  onNewTrade: (trade: Trade) => void;
  refreshInterval?: number;
  autoReconnect?: boolean;
  speedMultiplier: number;
  enabled?: boolean;
  isPlaying?: boolean;
  startTime?: number; // Unix timestamp in seconds
  currentTime?: number; // Unix timestamp in seconds
  onTimeUpdate?: (time: number) => void;
  setApiLoading?: (loading: boolean) => void;
  isLiveMode?: boolean; // New prop for LIVE MODE
}

export interface LiveTradeStreamRef {
  resetToTime: (time: number) => void;
  updateTokens: (newTokens: any[]) => void;
  enableLiveMode: (enable: boolean) => void; // New method for enabling/disabling LIVE MODE
}

export const LiveTradeStream = forwardRef<LiveTradeStreamRef, LiveTradeStreamProps>(({ 
  solarTokens, 
  onNewTrade,
  refreshInterval = 2000,
  autoReconnect = true,
  speedMultiplier = 1,
  enabled = true,
  isPlaying = true,
  startTime = Math.floor(Date.now() / 1000) - (30 * 24 * 3600), // Default to 30 days ago
  currentTime = Math.floor(Date.now() / 1000),
  onTimeUpdate,
  setApiLoading,
  isLiveMode = false // Default to false
}, ref): ReactElement => {
  console.log(`LiveTradeStream initialized with: enabled=${enabled}, isLiveMode=${isLiveMode}, tokens=${solarTokens.length}`);
  
  const [trades, setTrades] = useState<any[]>([]);
  const [isHidden, setIsHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [displayMode, setDisplayMode] = useState<'live' | 'historical'>(isLiveMode ? 'live' : 'historical');
  const tradesRef = useRef<HTMLDivElement>(null);
  const lastTradeTimeRef = useRef<number>(startTime);
  const autoScrollRef = useRef<boolean>(true);
  const scrollPositionRef = useRef<number>(0);
  const tradeQueueRef = useRef<any[]>([]);
  const processingTradesRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);
  const fetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speedMultiplierRef = useRef<number>(speedMultiplier);
  const currentPageRef = useRef<number>(1);
  const perPageRef = useRef<number>(100);
  const apiSuccessCountRef = useRef<number>(0);
  const apiFailureCountRef = useRef<number>(0);
  const processedTradeHashesRef = useRef<Set<string>>(new Set());
  const isLiveModeRef = useRef<boolean>(isLiveMode);
  const liveModeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const lastTradeProcessedTimeRef = useRef<number>(0);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    resetToTime: (time: number) => {
      // Safety check: Make sure we're not using a future timestamp
      const now = Math.floor(Date.now() / 1000);
      if (time > now) {
        console.warn(`Future timestamp detected (${time}, ${new Date(time * 1000).toLocaleString()}). Using 24 hours ago instead.`);
        time = now - 86400; // Use 24 hours ago instead
      }
      
      // Safety check: Make sure we're not using a timestamp too far in the past
      const oneYearAgo = now - (365 * 24 * 60 * 60);
      if (time < oneYearAgo) {
        console.warn(`Timestamp too far in the past (${time}, ${new Date(time * 1000).toLocaleString()}). Using one week ago instead.`);
        time = now - (7 * 24 * 60 * 60); // One week ago
      }
      
      console.log(`Resetting trade stream to time: ${new Date(time * 1000).toLocaleString()}`);
      
      // Clear existing state
      setTrades([]);
      tradeQueueRef.current = [];
      lastTradeTimeRef.current = time;
      processingTradesRef.current = false;
      currentPageRef.current = 1;
      apiSuccessCountRef.current = 0;
      apiFailureCountRef.current = 0;
      processedTradeHashesRef.current.clear();
      
      // Clear any existing fetch intervals
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
      
      // Clear any existing initial fetch timeouts
      if (initialFetchTimeoutRef.current) {
        clearTimeout(initialFetchTimeoutRef.current);
        initialFetchTimeoutRef.current = null;
      }
      
      // Immediately trigger a fetch with the new time
      console.log(`Immediately fetching trades from new time: ${new Date(time * 1000).toLocaleString()}`);
      
      // Set API loading state if available
      if (setApiLoading) {
        setApiLoading(true);
      }
      
      // Use a small timeout to ensure state updates have propagated
      setTimeout(() => {
        // For historical mode, we want to prefetch a large batch of trades
        // This ensures we have enough trades to fill the timeline
        const fetchHistoricalTrades = async () => {
          console.log(`Starting historical trade fetch from: ${new Date(time * 1000).toLocaleString()}`);
          
          // Keep fetching until we have enough trades or reach the current time
          let fetchCount = 0;
          const maxFetches = 20; // Increased limit to ensure we get all trades
          let allTradesCollected = false;
          
          // Store all fetched trades in a temporary array
          let allCollectedTrades: any[] = [];
          
          // Keep fetching until we've collected all trades or reached the maximum fetch count
          while (fetchCount < maxFetches && !allTradesCollected) {
            console.log(`Historical fetch #${fetchCount + 1}: Last time: ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}`);
            
            // Temporarily store the current queue
            const previousQueueLength = tradeQueueRef.current.length;
            
            // Fetch trades
            await fetchTrades();
            fetchCount++;
            
            // Check if we got any new trades
            const newTradesCount = tradeQueueRef.current.length - previousQueueLength;
            console.log(`Fetched ${newTradesCount} new trades in batch #${fetchCount}`);
            
            // Add the new trades to our collected trades array
            allCollectedTrades = [...allCollectedTrades, ...tradeQueueRef.current.slice(previousQueueLength)];
            
            // If we didn't get any new trades or we've reached close to the current time, we're done
            if (newTradesCount === 0 || lastTradeTimeRef.current >= now - 300) {
              allTradesCollected = true;
              console.log(`All trades collected or reached current time: ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}`);
            }
            
            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Sort all collected trades by timestamp to ensure strict chronological order
          allCollectedTrades.sort((a, b) => a.timestamp - b.timestamp);
          
          console.log(`Completed historical trade fetch: ${fetchCount} batches, collected ${allCollectedTrades.length} trades in total`);
          console.log(`Trades span from ${allCollectedTrades.length > 0 ? new Date(allCollectedTrades[0].timestamp * 1000).toLocaleString() : 'N/A'} to ${allCollectedTrades.length > 0 ? new Date(allCollectedTrades[allCollectedTrades.length - 1].timestamp * 1000).toLocaleString() : 'N/A'}`);
          
          // Replace the queue with the sorted trades
          tradeQueueRef.current = allCollectedTrades;
          
          // Reset the fetch interval after the historical fetch
          if (enabled && isPlaying) {
            fetchIntervalRef.current = setInterval(fetchTrades, refreshInterval);
          }
          
          // Clear API loading state
          if (setApiLoading) {
            setApiLoading(false);
          }
        };
        
        // Start the historical fetch
        fetchHistoricalTrades();
      }, 50);
    },
    updateTokens: (newTokens: any[]) => {
      console.log(`Updating tokens in LiveTradeStream to: ${newTokens.length} tokens`);
      // Clear existing trades and queue to start fresh with new tokens
      setTrades([]);
      tradeQueueRef.current = [];
      
      // Reset processing state
      processingTradesRef.current = false;
      currentPageRef.current = 1;
      
      // Clear the processed trade hashes when updating tokens
      processedTradeHashesRef.current.clear();
      
      // Don't reset the time - continue from where we left off
      console.log(`Trade stream will continue from: ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}`);
      
      // Immediately fetch new trades for the updated tokens
      if (enabled && isMounted) {
        setTimeout(() => {
          // For historical mode, prefetch trades to ensure we have a continuous timeline
          if (!isLiveModeRef.current) {
            const fetchHistoricalTradesForNewTokens = async () => {
              console.log(`Starting historical trade fetch for new tokens from: ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}`);
              
              // Keep fetching until we have enough trades or reach the current time
              let fetchCount = 0;
              const maxFetches = 10; // Limit to prevent infinite loops
              const now = Math.floor(Date.now() / 1000);
              
              while (fetchCount < maxFetches && tradeQueueRef.current.length < 1000 && lastTradeTimeRef.current < now - 300) {
                console.log(`Historical fetch for new tokens #${fetchCount + 1}: Queue size: ${tradeQueueRef.current.length}, Last time: ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}`);
                await fetchTrades();
                fetchCount++;
                
                // Small delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              console.log(`Completed historical trade fetch for new tokens: ${fetchCount} batches, ${tradeQueueRef.current.length} trades in queue`);
            };
            
            fetchHistoricalTradesForNewTokens();
          } else {
            // For live mode, just do a single fetch
            fetchTrades();
          }
        }, 100);
      }
    },
    enableLiveMode: (enable: boolean) => {
      console.log(`${enable ? 'Enabling' : 'Disabling'} LIVE MODE`);
      console.log(`LiveTradeStream.enableLiveMode called with: enable=${enable}, enabled=${enabled}, tokens=${solarTokens.length}, isMounted=${isMounted}`);
      
      // Skip if component is not mounted
      if (!isMounted) {
        console.log('LiveTradeStream not mounted, skipping enableLiveMode');
        return;
      }
      
      // Update the ref and state
      isLiveModeRef.current = enable;
      setDisplayMode(enable ? 'live' : 'historical');
      
      // Clear existing intervals
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
      
      if (liveModeIntervalRef.current) {
        clearInterval(liveModeIntervalRef.current);
        liveModeIntervalRef.current = null;
      }
      
      if (enable) {
        console.log('LIVE MODE enabled, setting up live data fetching');
        // In LIVE MODE, start from 5 minutes ago
        const now = Math.floor(Date.now() / 1000);
        const fiveMinutesAgo = now - (5 * 60);
        
        console.log(`LIVE MODE: Setting start time to 5 minutes ago: ${new Date(fiveMinutesAgo * 1000).toLocaleString()}`);
        
        // Reset state for live mode
        setTrades([]);
        tradeQueueRef.current = [];
        lastTradeTimeRef.current = fiveMinutesAgo;
        processingTradesRef.current = false;
        currentPageRef.current = 1;
        processedTradeHashesRef.current.clear();
        
        // Set API loading state if available
        if (setApiLoading) {
          setApiLoading(true);
        }
        
        // Immediately fetch trades
        fetchTrades().then(() => {
          if (setApiLoading) {
            setApiLoading(false);
          }
          
          // Ensure queue processing starts right away
          if (tradeQueueRef.current.length > 0) {
            console.log(`LIVE MODE: Starting to process ${tradeQueueRef.current.length} trades in queue`);
            processTrades();
          }
          
          // Set up 60-second interval for LIVE MODE
          liveModeIntervalRef.current = setInterval(() => {
            console.log("LIVE MODE: Fetching latest trades (60s interval)");
            fetchTrades();
          }, 60000); // 60 seconds
        });
      } else {
        // When disabling LIVE MODE, revert to normal behavior
        if (enabled && isPlaying) {
          fetchIntervalRef.current = setInterval(fetchTrades, refreshInterval);
        }
      }
    }
  }));

  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Process trades one by one with speed multiplier
  const processNextTrade = async () => {
    if (processingTradesRef.current || tradeQueueRef.current.length === 0) return;
    
    processingTradesRef.current = true;
    const trade = tradeQueueRef.current.shift();
    
    if (trade) {
      console.log("Processing trade via processNextTrade:", trade);

      // Ensure the trade has all required properties
      if (!trade.token) {
        console.error("❌ Trade missing token information:", trade);
        processingTradesRef.current = false;
        if (tradeQueueRef.current.length > 0) {
          processNextTrade();
        }
        return;
      }

      const tradeWithToken = {
        ...trade,
        token: trade.token,
        action: normalizeTradeAction(trade.action),
        tokenBAmount: trade.tokenBAmount
      } as Trade;

      console.log(`🔥 Creating beam for trade via processNextTrade: ${tradeWithToken.token?.ticker}, ${tradeWithToken.action}, ${Math.abs(tradeWithToken.tokenBAmount)} ADA`);
      
      // Call the callback with the trade
      if (typeof onNewTrade === 'function') {
        onNewTrade(tradeWithToken);
      } else {
        console.error("❌ onNewTrade is not a function:", onNewTrade);
      }

      setTrades(prevTrades => {
        if (prevTrades.some(t => t.hash === trade.hash && t.time === trade.time)) {
          return prevTrades;
        }
        // Add new trades to the beginning (newest first)
        return [{ ...tradeWithToken, isNew: true }, ...prevTrades].slice(0, 100);
      });
      
      if (autoScrollRef.current && tradesRef.current) {
        tradesRef.current.scrollTop = 0;
      }

      // Enhanced EXTREME slow speed handling for flash animation and trade processing
      let flashDuration = 3000;
      let currentSpeedMultiplier = speedMultiplierRef.current;
      
      // Apply progressively stronger slowdown factors as the speed gets lower
      let effectiveSpeed = currentSpeedMultiplier;
      
      if (currentSpeedMultiplier < 0.001) {
        // Ultra-ultra-slow for speeds below 0.001 (like 0.0001)
        // This makes 0.0001 speed about 100,000x slower than normal
        effectiveSpeed = Math.pow(currentSpeedMultiplier, 4) * 10000000;
        console.log(`🐢🐢🐢🐢 EXTREME SLOW: ${currentSpeedMultiplier}x → ${effectiveSpeed.toFixed(8)}x effective`);
      } else if (currentSpeedMultiplier < 0.01) {
        // Ultra-slow for speeds below 0.01
        effectiveSpeed = Math.pow(currentSpeedMultiplier, 3) * 10000;
        console.log(`🐢🐢🐢 ULTRA SLOW: ${currentSpeedMultiplier}x → ${effectiveSpeed.toFixed(6)}x effective`);
      } else if (currentSpeedMultiplier < 0.1) {
        // Very slow for speeds between 0.01 and 0.1
        effectiveSpeed = Math.pow(currentSpeedMultiplier, 2) * 100;
        console.log(`🐢🐢 VERY SLOW: ${currentSpeedMultiplier}x → ${effectiveSpeed.toFixed(4)}x effective`);
      } else if (currentSpeedMultiplier < 1) {
        // Slow for speeds between 0.1 and 1
        effectiveSpeed = currentSpeedMultiplier * 0.5;
        console.log(`🐢 SLOW: ${currentSpeedMultiplier}x → ${effectiveSpeed.toFixed(2)}x effective`);
      }
      
      // Flash timing based on effective speed
      flashDuration = flashDuration / effectiveSpeed;
      console.log(`Flash duration: ${flashDuration.toFixed(0)}ms (${currentSpeedMultiplier}x → ${effectiveSpeed.toFixed(8)}x effective)`);

      setTimeout(() => {
        setTrades(prevTrades => 
          prevTrades.map(t => 
            t.hash === trade.hash && t.time === trade.time ? { ...t, isNew: false } : t
          )
        );
      }, flashDuration);

      // Enhanced slow speed handling for trade processing delay
      // Apply extreme slowdown for ultra-slow speeds
      let processingDelay = 500; // Base delay in ms
      
      if (currentSpeedMultiplier < 0.001) {
        // Extreme slow mode - for the slowest setting (0.0001)
        // At 0.0001 speed, pause for up to 10 minutes between trades
        processingDelay = Math.min(600000, 500 / effectiveSpeed); // Cap at 10 minutes
        console.log(`🐢🐢🐢🐢 EXTREME SLOW processing delay: ${(processingDelay/1000).toFixed(0)}s (${effectiveSpeed.toFixed(8)}x effective)`);
      } else if (currentSpeedMultiplier < 0.01) {
        // Ultra-slow mode - aim for about 30 seconds to 2 minutes between trades
        processingDelay = Math.min(120000, 5000 / effectiveSpeed); // Cap at 2 minutes
        console.log(`🐢🐢🐢 ULTRA SLOW processing delay: ${(processingDelay/1000).toFixed(0)}s (${effectiveSpeed.toFixed(6)}x effective)`);
      } else if (currentSpeedMultiplier < 0.1) {
        // Very slow mode - aim for 5-30 seconds between trades
        processingDelay = Math.min(30000, 2000 / effectiveSpeed); // Cap at 30 seconds
        console.log(`🐢🐢 VERY SLOW processing delay: ${(processingDelay/1000).toFixed(0)}s (${effectiveSpeed.toFixed(4)}x effective)`);
      } else if (currentSpeedMultiplier < 1) {
        // Regular slow mode
        processingDelay = Math.max(1000, 500 / currentSpeedMultiplier);
        console.log(`🐢 SLOW processing delay: ${processingDelay.toFixed(0)}ms (${currentSpeedMultiplier}x speed)`);
      } else {
        // Normal/fast mode
        processingDelay = Math.max(200, 500 / currentSpeedMultiplier);
        console.log(`⚡ Normal processing delay: ${processingDelay.toFixed(0)}ms (${currentSpeedMultiplier}x speed)`);
      }
      
      console.log(`Waiting ${(processingDelay/1000).toFixed(1)}s before processing next trade (${currentSpeedMultiplier}x speed)`);
      await new Promise(resolve => setTimeout(resolve, processingDelay));
    }
    
    processingTradesRef.current = false;
    if (tradeQueueRef.current.length > 0) {
      processNextTrade();
    }
  };

  // Direct API call to fetch trades from TapTools API via our proxy
  const fetchTradesFromAPI = async (
    unit: string,
    timeframe: string,
    fromTimestamp: number,
    page: number,
    perPage: number
  ): Promise<Trade[]> => {
    const requestId = `${unit.slice(0, 8)}_${Date.now().toString().slice(-6)}`;
    
    // Safety check: Make sure we're not using a future timestamp
    const now = Math.floor(Date.now() / 1000);
    if (fromTimestamp > now) {
      console.warn(`[${requestId}] Future timestamp detected (${fromTimestamp}, ${new Date(fromTimestamp * 1000).toLocaleString()}). Using 24 hours ago instead.`);
      fromTimestamp = now - 86400; // Use 24 hours ago instead
    }
    
    // Another safety check - ensure the timestamp is not too far in the past
    const oneYearAgo = now - (365 * 24 * 60 * 60);
    if (fromTimestamp < oneYearAgo) {
      console.warn(`[${requestId}] Timestamp too far in the past (${fromTimestamp}, ${new Date(fromTimestamp * 1000).toLocaleString()}). Using one week ago instead.`);
      fromTimestamp = now - (7 * 24 * 60 * 60); // One week ago
    }
    
    console.log(`[${requestId}] Starting API request for ${unit} (timeframe: ${timeframe}, from: ${new Date(fromTimestamp * 1000).toLocaleString()})`);
    
    try {
      if (!unit || typeof unit !== 'string' || unit.trim() === '') {
        console.error(`[${requestId}] Invalid token unit provided:`, unit);
        return [];
      }

      // Verify this token is still in our solarTokens array
      const tokenStillVisible = solarTokens.some(t => t.unit === unit || t.policy_id === unit);
      if (!tokenStillVisible) {
        console.log(`[${requestId}] Token ${unit.slice(0, 8)}...${unit.slice(-8)} is no longer visible, skipping fetch`);
        return [];
      }

      // Build query parameters for our proxy endpoint
      const params = new URLSearchParams({
        unit: unit.trim(),
        timeframe,
        page: page.toString(),
        perPage: perPage.toString()
      });

      // Add fromTimestamp if provided
      if (fromTimestamp) {
        params.append('from', fromTimestamp.toString());
        console.log(`[${requestId}] Using 'from' timestamp: ${fromTimestamp} (${new Date(fromTimestamp * 1000).toLocaleString()})`);
      }
      
      // Create request URL and log detailed request info
      const url = `/beam/api/trades?${params.toString()}`;
      console.log(`[${requestId}] TRADE REQUEST:
        Token: ${unit.slice(0, 8)}...${unit.slice(-8)}
        Timeframe: ${timeframe}
        From: ${fromTimestamp ? new Date(fromTimestamp * 1000).toLocaleString() : 'Not specified'}
        Page: ${page}
        PerPage: ${perPage}
        Full URL: ${url}
      `);
      
      console.log(`[${requestId}] Fetching trades via proxy for ${unit}`);
      setLoading(true);
      setError(null);
      
      console.log(`[${requestId}] Fetching trades from: ${url}`);
      
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] API error (${response.status}): ${errorText}`);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[${requestId}] Successfully fetched trades, count:`, data.trades?.length || 0);
      
      // Log more detailed response info
      const tradeCount = data.trades?.length || 0;
      if (tradeCount > 0) {
        const firstTradeTime = new Date(data.trades[0].time * 1000).toLocaleString();
        const lastTradeTime = new Date(data.trades[tradeCount-1].time * 1000).toLocaleString();
        console.log(`[${requestId}] TRADE RESPONSE:
          Status: ${response.status} ${response.statusText}
          Trade Count: ${tradeCount}
          First Trade Time: ${firstTradeTime}
          Last Trade Time: ${lastTradeTime}
          First Trade Hash: ${data.trades[0].hash}
        `);
      } else {
        console.log(`[${requestId}] TRADE RESPONSE: No trades found for the given parameters`);
      }
      
      if (data.trades?.length > 0) {
        console.log(`[${requestId}] First trade:`, JSON.stringify(data.trades[0]).substring(0, 200) + '...');
      }
      setLoading(false);

      // Map trades to our format and ensure token is still visible
      return (data.trades || [])
        .map((trade: any) => {
          const token = solarTokens.find(t => t.unit === unit || t.policy_id === unit);
          if (!token) return null; // Skip if token not found
          
          // Filter out trades with less than 1 ADA
          if (Math.abs(trade.tokenBAmount) < 1) {
            console.log(`[${requestId}] Filtering out small trade (${Math.abs(trade.tokenBAmount)} ADA) for ${token.ticker}`);
            return null;
          }
          
          // Filter out trades that might be going to/from the same token
          // This is a heuristic based on available data - if we have more specific data about source/destination,
          // this logic could be improved
          if (trade.sourceToken && trade.destinationToken && trade.sourceToken === trade.destinationToken) {
            console.log(`[${requestId}] Filtering out self-trade for ${token.ticker}`);
            return null;
          }
          
          return {
            timestamp: trade.time,
            time: trade.time,
            hash: trade.hash,
            price: trade.price,
            tokenAAmount: trade.tokenAAmount,
            tokenBAmount: trade.tokenBAmount,
            action: normalizeTradeAction(trade.action),
            address: trade.address,
            exchange: trade.exchange,
            token: token
          };
        })
        .filter(Boolean) as Trade[]; // Remove null entries
    } catch (error) {
      console.error(`[${requestId}] Error fetching trades:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`API request failed: ${errorMessage}`);
      setLoading(false);
      return [];
    }
  };

  // Add this helper function before the fetchTrades function
  // Helper function to normalize trade actions
  const normalizeTradeAction = (action: string | undefined): 'buy' | 'sell' | 'add_liquidity' | 'remove_liquidity' | 'zap' => {
    if (!action) return 'buy'; // Default to buy if action is missing
    
    // Convert to lowercase for case-insensitive comparison
    const normalizedAction = action.toLowerCase();
    
    // Check if it's one of our recognized actions
    if (normalizedAction === 'buy' || 
        normalizedAction === 'sell' || 
        normalizedAction === 'add_liquidity' || 
        normalizedAction === 'remove_liquidity' ||
        normalizedAction === 'zap') {
      return normalizedAction as 'buy' | 'sell' | 'add_liquidity' | 'remove_liquidity' | 'zap';
    }
    
    // For unknown actions, try to map them to known ones
    if (normalizedAction.includes('zap')) {
      return 'zap';
    } else if (normalizedAction.includes('buy') || normalizedAction.includes('purchase')) {
      return 'buy';
    } else if (normalizedAction.includes('sell')) {
      return 'sell';
    } else if (normalizedAction.includes('add') && normalizedAction.includes('liquidity')) {
      return 'add_liquidity';
    } else if (normalizedAction.includes('remove') && normalizedAction.includes('liquidity')) {
      return 'remove_liquidity';
    }
    
    // Default to 'buy' for any other action
    console.log(`Normalizing unknown trade action: "${action}" to "buy"`);
    return 'buy';
  };

  // Update fetchTrades to handle LIVE MODE
  const fetchTrades = async () => {
    // Early return if not enabled, not mounted, or other conditions are not met
    if (!enabled || !isMounted) {
      console.log(`LiveTradeStream not enabled or not mounted, skipping fetchTrades (enabled=${enabled}, isMounted=${isMounted})`);
      return;
    }
    
    if (processingTradesRef.current || isHidden || (!isPlaying && !isLiveModeRef.current) || solarTokens.length === 0) {
      return;
    }

    try {
      processingTradesRef.current = true;
      setIsProcessing(true);
      
      // Calculate timeframe based on time difference
      const now = Math.floor(Date.now() / 1000);
      
      console.log(`Before validation - lastTradeTimeRef.current: ${lastTradeTimeRef.current} (${new Date(lastTradeTimeRef.current * 1000).toLocaleString()})`);
      
      // Validate lastTradeTimeRef.current to ensure it's not a future timestamp
      if (lastTradeTimeRef.current > now) {
        console.warn(`Future timestamp detected in lastTradeTimeRef (${lastTradeTimeRef.current}, ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}). Using 5 minutes ago instead.`);
        lastTradeTimeRef.current = now - 300; // 5 minutes ago instead of 24 hours
      }
      
      // Also ensure it's not too far in the past
      const oneYearAgo = now - (365 * 24 * 60 * 60);
      if (lastTradeTimeRef.current < oneYearAgo) {
        console.warn(`Timestamp too far in the past in lastTradeTimeRef (${lastTradeTimeRef.current}, ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}). Using one week ago instead.`);
        lastTradeTimeRef.current = now - (7 * 24 * 60 * 60); // One week ago
      }
      
      // For LIVE MODE, always use the most recent 5 minutes
      if (isLiveModeRef.current) {
        const fiveMinutesAgo = now - (5 * 60);
        console.log(`LIVE MODE: Setting last trade time to 5 minutes ago: ${new Date(fiveMinutesAgo * 1000).toLocaleString()}`);
        lastTradeTimeRef.current = fiveMinutesAgo;
      }
      
      console.log(`After validation - lastTradeTimeRef.current: ${lastTradeTimeRef.current} (${new Date(lastTradeTimeRef.current * 1000).toLocaleString()})`);
      
      const timeDiff = now - lastTradeTimeRef.current;
      let timeframe = '1h';
      
      // For LIVE MODE, always use 1h timeframe since we're looking at recent data
      if (isLiveModeRef.current) {
        timeframe = '1h';
      } else {
        // Determine the appropriate timeframe based on the time difference
        // This helps optimize API calls by using larger timeframes for longer periods
        if (timeDiff > 30 * 24 * 60 * 60) {
          timeframe = 'all';
        } else if (timeDiff > 7 * 24 * 60 * 60) {
          timeframe = '30d';
        } else if (timeDiff > 3 * 24 * 60 * 60) {
          timeframe = '7d';
        } else if (timeDiff > 60 * 60) {
          timeframe = '24h';
        }
      }
      
      // Log the fetch batch details
      const batchId = Date.now().toString().slice(-6);
      console.log(`[BATCH:${batchId}] ===========================================`);
      console.log(`[BATCH:${batchId}] ${isLiveModeRef.current ? 'LIVE MODE: ' : ''}Fetching trades for ${solarTokens.length} tokens`);
      console.log(`[BATCH:${batchId}] Current time: ${new Date(now * 1000).toLocaleString()}`);
      console.log(`[BATCH:${batchId}] Last trade time: ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}`);
      console.log(`[BATCH:${batchId}] Time difference: ${timeDiff} seconds (${(timeDiff / 3600).toFixed(2)} hours)`);
      console.log(`[BATCH:${batchId}] Selected timeframe: ${timeframe}`);
      console.log(`[BATCH:${batchId}] Page: ${currentPageRef.current}`);
      
      console.log(`Fetching trades with timeframe: ${timeframe}, from timestamp: ${lastTradeTimeRef.current} (${new Date(lastTradeTimeRef.current * 1000).toLocaleString()})`);
      
      // Only show loading indicator if we're not in live mode or if this is the first fetch in live mode
      // This prevents the loading indicator from flashing constantly in live mode
      if (setApiLoading && (!isLiveModeRef.current || tradeQueueRef.current.length === 0)) {
        setApiLoading(true);
      }
      
      // Fetch trades for each token in parallel
      const tokenPromises = solarTokens
        .filter(token => {
          // Filter out ADA tokens to prevent zero-length beams
          if (token.ticker === 'ADA' || token.unit === 'lovelace') {
            console.log(`[BATCH:${batchId}] Skipping API fetch for ADA token to prevent zero-length beams`);
            return false;
          }
          return true;
        })
        .map(token => 
          fetchTradesFromAPI(
            token.unit || token.policy_id,
            timeframe,
            lastTradeTimeRef.current,
            currentPageRef.current,
            perPageRef.current
          )
        );

      const results = await Promise.all(tokenPromises);
      const allTrades = results.flat();
      
      if (allTrades.length > 0) {
        // Sort all trades by timestamp - CHRONOLOGICAL order (oldest first)
        allTrades.sort((a, b) => a.timestamp - b.timestamp);
        
        // Log the time range of the fetched trades
        if (allTrades.length > 0) {
          const oldestTrade = allTrades[0];
          const newestTrade = allTrades[allTrades.length - 1];
          console.log(`[BATCH:${batchId}] Fetched trades from ${new Date(oldestTrade.timestamp * 1000).toLocaleString()} to ${new Date(newestTrade.timestamp * 1000).toLocaleString()}`);
        }
        
        // Update the last trade time to the latest trade timestamp after we process all trades
        // We'll need this timestamp for the next API call to get newer trades
        const latestTradeTime = allTrades[allTrades.length - 1].timestamp;
        
        // Safety check: Make sure we're not using a future timestamp
        const safeLatestTradeTime = latestTradeTime > now ? now - 86400 : latestTradeTime;
        
        if (latestTradeTime > now) {
          console.warn(`Future latestTradeTime detected (${latestTradeTime}, ${new Date(latestTradeTime * 1000).toLocaleString()}). Using safe time instead: ${new Date(safeLatestTradeTime * 1000).toLocaleString()}`);
        }
        
        // Update the last trade time for the next fetch
        lastTradeTimeRef.current = safeLatestTradeTime;
        
        // Add trades to the queue
        tradeQueueRef.current = [...tradeQueueRef.current, ...allTrades];
        
        // Re-sort the entire queue to ensure strict chronological order
        tradeQueueRef.current.sort((a, b) => a.timestamp - b.timestamp);
        
        console.log(`[BATCH:${batchId}] Added ${allTrades.length} trades to queue. Total: ${tradeQueueRef.current.length}`);
        console.log(`[BATCH:${batchId}] Latest trade time updated to: ${new Date(safeLatestTradeTime * 1000).toLocaleString()}`);
        
        // Check if we got a full page of results for any token
        const hasFullPage = results.some(trades => trades.length >= perPageRef.current);
        
        // If we're not in LIVE MODE and we got a full page of results, we need to fetch more
        if (!isLiveModeRef.current && hasFullPage) {
          // Increment page for next fetch
          currentPageRef.current++;
          console.log(`[BATCH:${batchId}] Full page of results found, incrementing to page ${currentPageRef.current}`);
          
          // Schedule another fetch immediately to get more trades
          // This ensures we collect ALL trades for the selected time period
          setTimeout(() => {
            console.log(`[BATCH:${batchId}] Scheduling another fetch to collect more trades`);
            processingTradesRef.current = false;
            fetchTrades();
          }, 500); // Small delay to prevent rate limiting
        } else {
          // Reset to page 1 if we didn't get a full page for any token
          currentPageRef.current = 1;
          console.log(`[BATCH:${batchId}] No full pages, resetting to page 1`);
          
          // Release the processing lock
          processingTradesRef.current = false;
        }
      } else {
        // If no trades were found, increment the timestamp to avoid fetching the same empty range
        lastTradeTimeRef.current += 60; // Move forward 1 minute
        currentPageRef.current = 1;
        console.log(`[BATCH:${batchId}] No trades found in the current time range. Moving forward to ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}`);
        
        // Release the processing lock
        processingTradesRef.current = false;
      }
      
      console.log(`[BATCH:${batchId}] Batch fetch completed ===========================================`);
    } catch (error) {
      console.error("Error processing trades:", error);
      // Move time forward to avoid getting stuck
      lastTradeTimeRef.current += 300;
      apiFailureCountRef.current++;
      
      // Release the processing lock
      processingTradesRef.current = false;
    } finally {
      // Only clear the processing flag if we're not scheduling another fetch
      if (processingTradesRef.current && !isLiveModeRef.current) {
        processingTradesRef.current = false;
      }
      
      setIsProcessing(false);
      
      // Only hide loading indicator if we're not in live mode
      // In live mode, we'll manage loading indicators differently to prevent flashing
      if (setApiLoading && !isLiveModeRef.current) {
        setApiLoading(false);
      }
    }
  };

  // Process trades from the queue
  const processTrades = () => {
    try {
      // Early return if not enabled or not mounted
      if (!enabled || !isMounted) {
        return;
      }
      
      if ((!isPlaying && !isLiveModeRef.current) || tradeQueueRef.current.length === 0) return;
      
      setIsProcessing(true);
      
      // Manage trade processing rate based on speed multiplier
      const currentSpeed = speedMultiplierRef.current;
      
      // Calculate time since last trade processed 
      const now = Date.now();
      const timeSinceLastTrade = now - (lastTradeProcessedTimeRef.current || 0);
      
      // Determine minimum wait time between trades based on speed
      let minTimeBetweenTrades = 200; // Default at normal speed (1x)
      
      if (isLiveModeRef.current) {
        // In LIVE MODE, process trades at a steady pace regardless of speed setting
        minTimeBetweenTrades = 1000; // One trade per second in LIVE MODE
        console.log(`🔴 LIVE MODE trade rate: 1 trade per second`);
      } else if (currentSpeed < 0.001) {
        // Ultra slow (0.0001x to 0.001x): Approximately 1 trade every 2-5 seconds
        minTimeBetweenTrades = 2000 + ((0.001 - currentSpeed) / 0.001) * 3000;
        console.log(`🐌🐌🐌 ULTRA SLOW trade rate: 1 trade every ${(minTimeBetweenTrades/1000).toFixed(1)} seconds (${currentSpeed.toFixed(5)}x)`);
      } else if (currentSpeed < 0.01) {
        // Very slow (0.001x to 0.01x): 1 trade every 0.5-2 seconds
        minTimeBetweenTrades = 500 + ((0.01 - currentSpeed) / 0.01) * 1500;
        console.log(`🐌🐌 VERY SLOW trade rate: 1 trade every ${(minTimeBetweenTrades/1000).toFixed(1)} seconds (${currentSpeed.toFixed(4)}x)`);
      } else if (currentSpeed < 0.1) {
        // Slow (0.01x to 0.1x): 1 trade every 0.2-0.5 seconds
        minTimeBetweenTrades = 200 + ((0.1 - currentSpeed) / 0.1) * 300;
        console.log(`🐌 SLOW trade rate: 1 trade every ${(minTimeBetweenTrades/1000).toFixed(2)} seconds (${currentSpeed.toFixed(2)}x)`);
      } else {
        // Normal to fast: Allow multiple trades per frame for speeds > 1x
        minTimeBetweenTrades = Math.max(50, 200 / currentSpeed);
      }
      
      // Only process a trade if enough time has passed since the last one
      if (timeSinceLastTrade < minTimeBetweenTrades) {
        setIsProcessing(false);
        return; // Not enough time has passed yet
      }
      
      // Ensure the queue is sorted in chronological order before processing
      if (tradeQueueRef.current.length > 1) {
        tradeQueueRef.current.sort((a, b) => a.timestamp - b.timestamp);
      }
      
      // Filter the queue to only include trades for tokens that are still visible
      // and trades that meet our minimum criteria
      if (tradeQueueRef.current.length > 0) {
        console.log(`Processing trade queue with ${tradeQueueRef.current.length} trades (LIVE MODE: ${isLiveModeRef.current})`);
        
        const originalLength = tradeQueueRef.current.length;
        tradeQueueRef.current = tradeQueueRef.current.filter(trade => {
          // Skip trades that have already been processed
          if (trade.hash && processedTradeHashesRef.current.has(trade.hash)) {
            console.log(`Filtering out already processed trade with hash: ${trade.hash}`);
            return false;
          }
          
          // Check if the token is still in our solarTokens array
          const tokenStillVisible = solarTokens.some(t => 
            t.unit === trade.token?.unit || 
            t.policy_id === trade.token?.unit ||
            t.unit === trade.token?.policy_id || 
            t.policy_id === trade.token?.policy_id
          );
          
          if (!tokenStillVisible) {
            console.log(`Removing trade for token ${trade.token?.ticker || 'Unknown'} as it's no longer visible`);
            return false;
          }
          
          // Filter out trades with less than 1 ADA
          if (Math.abs(trade.tokenBAmount) < 1) {
            console.log(`Filtering out small trade (${Math.abs(trade.tokenBAmount)} ADA) for ${trade.token?.ticker || 'Unknown'}`);
            return false;
          }
          
          // Filter out trades that might be going to/from the same token
          if (trade.sourceToken && trade.destinationToken && trade.sourceToken === trade.destinationToken) {
            console.log(`Filtering out self-trade for ${trade.token?.ticker || 'Unknown'}`);
            return false;
          }
          
          // Skip trades for ADA token to prevent zero-length beams
          if (trade.token?.ticker === 'ADA' || trade.token?.unit === 'lovelace') {
            console.log(`Filtering out ADA token trade to prevent zero-length beam`);
            return false;
          }
          
          return true;
        });
        
        if (originalLength !== tradeQueueRef.current.length) {
          console.log(`Filtered out ${originalLength - tradeQueueRef.current.length} trades (invisible tokens, <1 ADA, self-trades, or already processed)`);
        }
      }
      
      // Determine how many trades to process based on speed or LIVE MODE
      // In LIVE MODE, process just 1 trade at a time for a steady stream
      // For slow speeds (< 0.1), always process just 1 trade
      // For normal/fast speeds, scale up to a maximum of 5 trades
      const tradesToProcess = isLiveModeRef.current 
        ? 1 
        : currentSpeed < 0.1 
          ? 1 
          : Math.max(1, Math.min(5, Math.floor(currentSpeed)));
      
      // Don't process more trades than we have in the queue
      const actualTradesToProcess = Math.min(tradesToProcess, tradeQueueRef.current.length);
      
      if (actualTradesToProcess > 0) {
        console.log(`Processing ${actualTradesToProcess} trades (${isLiveModeRef.current ? 'LIVE MODE' : `speed: ${currentSpeed}x`}, queue: ${tradeQueueRef.current.length}, interval: ${(minTimeBetweenTrades/1000).toFixed(2)}s)`);
        
        // Get the trades to process - get from the beginning of the queue (oldest trades)
        const trades = tradeQueueRef.current.slice(0, actualTradesToProcess);
        
        // Remove the processed trades from the queue
        tradeQueueRef.current = tradeQueueRef.current.slice(actualTradesToProcess);
        
        // Process each trade
        trades.forEach(trade => {
          try {
            console.log(`🔄 Processing trade: ${trade.token?.ticker || 'Unknown'}, action: ${trade.action}, amount: ${Math.abs(trade.tokenBAmount)} ADA`);
            
            // Ensure the trade has all required properties
            if (!trade.token) {
              console.error("❌ Trade missing token information:", trade);
              return;
            }
            
            // Double-check that this token is still visible
            const tokenStillVisible = solarTokens.some(t => 
              t.unit === trade.token.unit || 
              t.policy_id === trade.token.unit ||
              t.unit === trade.token.policy_id || 
              t.policy_id === trade.token.policy_id
            );
            
            if (!tokenStillVisible) {
              console.log(`Skipping trade for token ${trade.token.ticker} as it's no longer visible`);
              return;
            }
            
            // Skip trades for ADA token to prevent zero-length beams
            if (trade.token.ticker === 'ADA' || trade.token.unit === 'lovelace') {
              console.log(`Skipping trade for ADA token to prevent zero-length beam`);
              return;
            }
            
            // Double-check for minimum ADA amount
            if (Math.abs(trade.tokenBAmount) < 1) {
              console.log(`Skipping trade for token ${trade.token.ticker} as it's less than 1 ADA (${Math.abs(trade.tokenBAmount)} ADA)`);
              return;
            }
            
            // Double-check for self-trades
            if (trade.sourceToken && trade.destinationToken && trade.sourceToken === trade.destinationToken) {
              console.log(`Skipping self-trade for token ${trade.token.ticker}`);
              return;
            }
            
            // Add the trade hash to the processed set to prevent duplicates
            if (trade.hash) {
              if (processedTradeHashesRef.current.has(trade.hash)) {
                console.log(`Skipping already processed trade with hash: ${trade.hash}`);
                return;
              }
              processedTradeHashesRef.current.add(trade.hash);
            }
            
            // Add the trade to the terminal display - always add to beginning of list (newest first)
            setTrades(prevTrades => {
              if (prevTrades.some(t => t.hash === trade.hash && t.time === trade.time)) {
                return prevTrades;
              }
              // Add new trades to the beginning (newest first)
              return [{ ...trade, isNew: true }, ...prevTrades].slice(0, 100);
            });

            // Auto-scroll if enabled - scroll to top since newest trades are at the top
            if (autoScrollRef.current && tradesRef.current) {
              tradesRef.current.scrollTop = 0;
            }

            // Calculate flash duration based on speed
            const flashDuration = isLiveModeRef.current
              ? 3000 // Fixed duration for LIVE MODE
              : currentSpeed < 0.01 
                ? 3000 / Math.pow(currentSpeed, 0.5) 
                : 3000 / currentSpeed;

            // Remove the "new" flash effect after animation
            setTimeout(() => {
              setTrades(prevTrades => 
                prevTrades.map(t => 
                  t.hash === trade.hash && t.time === trade.time ? { ...t, isNew: false } : t
                )
              );
            }, flashDuration);

            // Call the onNewTrade callback with enhanced logging
            console.log(`🔥 Creating beam for trade via processTrades: ${trade.token?.ticker}, ${trade.action}, ${Math.abs(trade.tokenBAmount)} ADA`);
            
            // Create a clean trade object to pass to onNewTrade
            const tradeForBeam = {
              ...trade,
              token: trade.token,
              action: normalizeTradeAction(trade.action),
              tokenBAmount: trade.tokenBAmount
            };
            
            // Call the callback with the trade
            if (typeof onNewTrade === 'function') {
              onNewTrade(tradeForBeam);
            } else {
              console.error("❌ onNewTrade is not a function:", onNewTrade);
            }
            
            // Update the current time if callback is provided
            if (onTimeUpdate && trade.timestamp) {
              onTimeUpdate(trade.timestamp);
            }
          } catch (error) {
            console.error("❌ Error processing individual trade:", error);
          }
        });
        
        // Update the last trade processed time
        lastTradeProcessedTimeRef.current = now;
      }
      setIsProcessing(false);
    } catch (error) {
      console.error("❌ Error in processTrades:", error);
      setIsProcessing(false);
    }
  };

  // Update useEffect to handle timeline controls with better error handling
  useEffect(() => {
    // Skip initialization if not enabled or not mounted
    if (!enabled || !isMounted) {
      console.log(`LiveTradeStream not enabled or not mounted, skipping initialization (enabled=${enabled}, isMounted=${isMounted})`);
      return;
    }
    
    if (!hasInitializedRef.current) {
      console.log("Initializing LiveTradeStream with startTime:", startTime, new Date(startTime * 1000).toLocaleString());
      
      // Safety check: Make sure we're not using a future timestamp
      const now = Math.floor(Date.now() / 1000);
      let safeStartTime = startTime;
      
      if (safeStartTime > now) {
        console.warn(`Future startTime detected (${safeStartTime}, ${new Date(safeStartTime * 1000).toLocaleString()}). Using 24 hours ago instead.`);
        safeStartTime = now - 86400; // Use 24 hours ago instead
      }
      
      // Also ensure it's not too far in the past
      const oneYearAgo = now - (365 * 24 * 60 * 60);
      if (safeStartTime < oneYearAgo) {
        console.warn(`Timestamp too far in the past (${safeStartTime}, ${new Date(safeStartTime * 1000).toLocaleString()}). Using one week ago instead.`);
        safeStartTime = now - (7 * 24 * 60 * 60); // One week ago
      }
      
      console.log(`Using safe start time: ${safeStartTime} (${new Date(safeStartTime * 1000).toLocaleString()})`);
      
      setTrades([]);
      tradeQueueRef.current = [];
      lastTradeTimeRef.current = safeStartTime;
      processingTradesRef.current = false;
      currentPageRef.current = 1;
      hasInitializedRef.current = true;
    }

    if (!enabled || !isPlaying) {
      console.log("LiveTradeStream disabled or paused, clearing intervals");
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
      if (initialFetchTimeoutRef.current) {
        clearTimeout(initialFetchTimeoutRef.current);
        initialFetchTimeoutRef.current = null;
      }
      return;
    }

    // Clear any existing intervals to prevent multiple concurrent intervals
    if (fetchIntervalRef.current) {
      clearInterval(fetchIntervalRef.current);
      fetchIntervalRef.current = null;
    }
    if (initialFetchTimeoutRef.current) {
      clearTimeout(initialFetchTimeoutRef.current);
      initialFetchTimeoutRef.current = null;
    }

    console.log(`Setting up fetch intervals with speed multiplier: ${speedMultiplier}x`);
    
    // Use a longer interval to prevent excessive API calls
    // The minimum interval is 5 seconds, even with high speed multiplier
    const intervalTime = Math.max(5000, 10000 / speedMultiplier);
    
    // Only do the initial fetch if we don't already have trades in the queue
    if (tradeQueueRef.current.length < 10) {
      console.log("Scheduling initial fetch in 100ms");
      initialFetchTimeoutRef.current = setTimeout(() => {
        console.log("Executing initial fetch");
        
        // For historical mode, we want to prefetch a large batch of trades
        // This ensures we have enough trades to fill the timeline
        const fetchInitialHistoricalTrades = async () => {
          if (!isLiveModeRef.current) {
            console.log(`Starting initial historical trade fetch from: ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}`);
            
            // Keep fetching until we have enough trades or reach the current time
            let fetchCount = 0;
            const maxFetches = 20; // Increased limit to ensure we get all trades
            const now = Math.floor(Date.now() / 1000);
            let allTradesCollected = false;
            
            // Store all fetched trades in a temporary array
            let allCollectedTrades: any[] = [];
            
            // Keep fetching until we've collected all trades or reached the maximum fetch count
            while (fetchCount < maxFetches && !allTradesCollected) {
              console.log(`Initial historical fetch #${fetchCount + 1}: Last time: ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}`);
              
              // Temporarily store the current queue
              const previousQueueLength = tradeQueueRef.current.length;
              
              // Fetch trades
              await fetchTrades();
              fetchCount++;
              
              // Check if we got any new trades
              const newTradesCount = tradeQueueRef.current.length - previousQueueLength;
              console.log(`Fetched ${newTradesCount} new trades in batch #${fetchCount}`);
              
              // Add the new trades to our collected trades array
              allCollectedTrades = [...allCollectedTrades, ...tradeQueueRef.current.slice(previousQueueLength)];
              
              // If we didn't get any new trades or we've reached close to the current time, we're done
              if (newTradesCount === 0 || lastTradeTimeRef.current >= now - 300) {
                allTradesCollected = true;
                console.log(`All trades collected or reached current time: ${new Date(lastTradeTimeRef.current * 1000).toLocaleString()}`);
              }
              
              // Small delay to prevent rate limiting
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            // Sort all collected trades by timestamp to ensure strict chronological order
            allCollectedTrades.sort((a, b) => a.timestamp - b.timestamp);
            
            console.log(`Completed initial historical trade fetch: ${fetchCount} batches, collected ${allCollectedTrades.length} trades in total`);
            console.log(`Trades span from ${allCollectedTrades.length > 0 ? new Date(allCollectedTrades[0].timestamp * 1000).toLocaleString() : 'N/A'} to ${allCollectedTrades.length > 0 ? new Date(allCollectedTrades[allCollectedTrades.length - 1].timestamp * 1000).toLocaleString() : 'N/A'}`);
            
            // Replace the queue with the sorted trades
            tradeQueueRef.current = allCollectedTrades;
          } else {
            // For live mode, just do a single fetch
            await fetchTrades();
          }
        };
        
        // Start the initial fetch
        fetchInitialHistoricalTrades().catch(err => {
          console.error("Error in initial fetch:", err);
        });
      }, 100);
    } else {
      console.log(`Skipping initial fetch, already have ${tradeQueueRef.current.length} trades in queue`);
    }

    // Set up the interval for subsequent fetches
    console.log(`Setting up fetch interval every ${intervalTime}ms`);
    fetchIntervalRef.current = setInterval(() => {
      // Only fetch more if queue is getting low and we're not already processing
      // For historical mode, we want to ensure we have plenty of trades queued up
      const minQueueSize = isLiveModeRef.current ? 20 : 100;
      
      if (tradeQueueRef.current.length < minQueueSize && !processingTradesRef.current) {
        console.log(`Queue has ${tradeQueueRef.current.length} trades (minimum: ${minQueueSize}), fetching more...`);
        fetchTrades().catch(err => {
          console.error("Error in interval fetch:", err);
        });
      } else {
        console.log(`Skipping fetch, queue has ${tradeQueueRef.current.length} trades (minimum: ${minQueueSize}) or processing is in progress`);
      }
    }, intervalTime);

    return () => {
      console.log("Cleaning up fetch intervals");
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
      if (initialFetchTimeoutRef.current) {
        clearTimeout(initialFetchTimeoutRef.current);
      }
    };
  }, [enabled, speedMultiplier, solarTokens, isPlaying, startTime, currentTime, isMounted]);

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

  // Update animation durations when speed multiplier changes
  useEffect(() => {
    // Update the ref to always have the current speed multiplier
    speedMultiplierRef.current = speedMultiplier;
    console.log(`LiveTradeStream speed multiplier updated to: ${speedMultiplier}x`);
    
    // Enhanced slow speed handling
    let effectiveSpeed = speedMultiplier;
    if (speedMultiplier < 0.01) {
      // Ultra-slow for speeds below 0.01
      effectiveSpeed = Math.pow(speedMultiplier, 3) * 1000;
      console.log(`Using ultra-slow speed: ${speedMultiplier}x → ${effectiveSpeed.toFixed(6)}x effective`);
    } else if (speedMultiplier < 0.1) {
      // Regular slow speeds between 0.01 and 0.1
      effectiveSpeed = Math.pow(speedMultiplier, 2) * 10;
      console.log(`Using enhanced slow speed: ${speedMultiplier}x → ${effectiveSpeed.toFixed(4)}x effective`);
    }
    
    // Force CSS animation duration update by adding/removing a class
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .new-trade-flash {
        animation-duration: ${2000 / effectiveSpeed}ms !important;
        animation-timing-function: ease-out !important;
        animation-fill-mode: forwards !important;
      }
      .buy-flash {
        animation-name: buy-flash;
      }
      .sell-flash {
        animation-name: sell-flash;
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
      @keyframes add-liquidity-flash {
        0% { background-color: rgba(168, 85, 247, 0.3); }
        50% { background-color: rgba(168, 85, 247, 0.1); }
        100% { background-color: rgba(0, 0, 0, 0); }
      }
      @keyframes remove-liquidity-flash {
        0% { background-color: rgba(249, 115, 22, 0.3); }
        50% { background-color: rgba(249, 115, 22, 0.1); }
        100% { background-color: rgba(0, 0, 0, 0); }
      }
      @keyframes zap-flash {
        0% { background-color: rgba(234, 179, 8, 0.3); }
        50% { background-color: rgba(234, 179, 8, 0.1); }
        100% { background-color: rgba(0, 0, 0, 0); }
      }
    `;
    document.head.appendChild(styleElement);
    
    // Update existing trade processing speed
    if (fetchIntervalRef.current) {
      clearInterval(fetchIntervalRef.current);
      // Adjust interval timing based on effective speed
      // For very slow speeds, use a longer interval to prevent excessive API calls
      // The minimum interval is 1 second, and maximum is 60 seconds for ultra-slow speeds
      const intervalTime = Math.min(60000, Math.max(1000, 2000 / effectiveSpeed));
      console.log(`Updating fetch interval to ${intervalTime}ms based on speed ${speedMultiplier}x (effective: ${effectiveSpeed.toFixed(6)}x)`);
      fetchIntervalRef.current = setInterval(fetchTrades, intervalTime);
    }
    
    // If we have trades in the queue but aren't processing them, kick off processing
    // with the new speed
    if (tradeQueueRef.current.length > 0 && !processingTradesRef.current) {
      processNextTrade();
    }
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [speedMultiplier]);

  // Set up visibility change detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsHidden(document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Process trades at animation frame rate with better error handling
  useEffect(() => {
    if (!enabled || !isMounted) return;
    
    let animationFrameId: number;
    let lastProcessTime = 0;
    const minProcessInterval = 100; // Minimum time between processing trades (ms)
    
    const animate = () => {
      const now = Date.now();
      // Only process trades if enough time has passed since last processing
      if (now - lastProcessTime >= minProcessInterval) {
        try {
          processTrades();
          lastProcessTime = now;
        } catch (error) {
          console.error("Error processing trades in animation frame:", error);
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, isPlaying, isMounted]);

  // Reset when startTime changes
  useEffect(() => {
    if (startTime) {
      console.log(`Resetting trade stream due to startTime change: ${new Date(startTime * 1000).toLocaleString()}`);
      setTrades([]);
      tradeQueueRef.current = [];
      lastTradeTimeRef.current = startTime;
      processingTradesRef.current = false;
      currentPageRef.current = 1;
      processedTradeHashesRef.current.clear();
      
      // Update the default startTime to support up to 30 days
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
      
      // If startTime is older than 30 days, validate it
      if (startTime < thirtyDaysAgo) {
        console.log(`StartTime is older than 30 days (${new Date(startTime * 1000).toLocaleString()}), validating...`);
        // Allow it if it's not too old (within a year)
        const oneYearAgo = now - (365 * 24 * 60 * 60);
        if (startTime < oneYearAgo) {
          console.warn(`StartTime too far in the past (${new Date(startTime * 1000).toLocaleString()}). Using 30 days ago instead.`);
          lastTradeTimeRef.current = thirtyDaysAgo;
        }
      }
    }
  }, [startTime]);

  // Update useEffect to handle LIVE MODE
  useEffect(() => {
    // Skip if not mounted
    if (!isMounted) {
      console.log('LiveTradeStream not mounted, skipping LIVE MODE setup');
      return;
    }
    
    // Update the ref when the prop changes
    isLiveModeRef.current = isLiveMode;
    
    // Update the display mode state to force re-render
    setDisplayMode(isLiveMode ? 'live' : 'historical');
    
    // Handle LIVE MODE changes
    if (isLiveMode) {
      console.log("LIVE MODE enabled via props");
      
      // Clear existing intervals
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
      
      if (liveModeIntervalRef.current) {
        clearInterval(liveModeIntervalRef.current);
        liveModeIntervalRef.current = null;
      }
      
      // In LIVE MODE, start from 5 minutes ago
      const now = Math.floor(Date.now() / 1000);
      const fiveMinutesAgo = now - (5 * 60);
      
      console.log(`LIVE MODE: Setting start time to 5 minutes ago: ${new Date(fiveMinutesAgo * 1000).toLocaleString()}`);
      
      // Reset state for live mode
      setTrades([]);
      tradeQueueRef.current = [];
      lastTradeTimeRef.current = fiveMinutesAgo;
      processingTradesRef.current = false;
      currentPageRef.current = 1;
      processedTradeHashesRef.current.clear();
      
      // Set API loading state if available - only once at the beginning of live mode
      if (setApiLoading) {
        setApiLoading(true);
      }
      
      // Immediately fetch trades
      fetchTrades().then(() => {
        // Hide loading indicator after initial fetch
        if (setApiLoading) {
          setApiLoading(false);
        }
        
        // Ensure queue processing starts right away
        if (tradeQueueRef.current.length > 0) {
          console.log(`LIVE MODE: Starting to process ${tradeQueueRef.current.length} trades in queue`);
          processTrades();
        }
        
        // Set up a less frequent interval for live mode to prevent UI flashing
        // This interval will be used to fetch new trades every 10 seconds
        liveModeIntervalRef.current = setInterval(() => {
          // Don't show loading indicator for these regular updates
          fetchTrades();
        }, 10000); // 10 seconds
      });
      
      return () => {
        // Clean up interval when component unmounts or live mode changes
        if (liveModeIntervalRef.current) {
          clearInterval(liveModeIntervalRef.current);
          liveModeIntervalRef.current = null;
        }
      };
    } else {
      // Clean up live mode interval when exiting live mode
      if (liveModeIntervalRef.current) {
        clearInterval(liveModeIntervalRef.current);
        liveModeIntervalRef.current = null;
      }
      
      // Reset the fetch interval for normal mode
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
      
      // Set up normal fetch interval (if enabled)
      if (enabled) {
        const intervalTime = Math.min(60000, Math.max(1000, 2000 / speedMultiplierRef.current));
        console.log(`Setting up normal fetch interval: ${intervalTime}ms`);
        fetchIntervalRef.current = setInterval(fetchTrades, intervalTime);
      }
    }
  }, [isLiveMode, enabled, isMounted]);

  // Add a useEffect to set isMounted to true when the component is mounted
  useEffect(() => {
    console.log('LiveTradeStream component mounted');
    setIsMounted(true);
    
    return () => {
      console.log('LiveTradeStream component unmounted');
      setIsMounted(false);
      
      // Clean up all intervals when component unmounts
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
      if (initialFetchTimeoutRef.current) {
        clearTimeout(initialFetchTimeoutRef.current);
        initialFetchTimeoutRef.current = null;
      }
      if (liveModeIntervalRef.current) {
        clearInterval(liveModeIntervalRef.current);
        liveModeIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`fixed top-0 right-0 w-[300px] h-screen bg-zinc-900/90 backdrop-blur-sm overflow-hidden border-l border-zinc-800 transition-all duration-300 ${isHidden ? 'translate-x-[calc(100%-40px)]' : 'translate-x-0'}`}>
      <div className="flex items-center h-12 px-4 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 justify-between">
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${isProcessing ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`}></div>
          <span className="font-mono text-sm text-green-400">
            Token Trades
          </span>
        </div>
        <button 
          className="text-zinc-500 hover:text-zinc-300 focus:outline-none"
          onClick={() => setIsHidden(!isHidden)}
          aria-label={isHidden ? "Show terminal" : "Hide terminal"}
        >
          {isHidden ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          )}
        </button>
      </div>
      
      {/* Visible handle when terminal is hidden */}
      {isHidden && (
        <div 
          className="absolute top-0 left-0 h-full w-[40px] bg-zinc-800/50 border-l border-zinc-700 cursor-pointer hover:bg-zinc-700/50 transition-colors flex items-center justify-center"
          onClick={() => setIsHidden(false)}
        >
          <div className="flex flex-col items-center">
            <svg className="w-5 h-5 mb-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
            <span className="font-mono text-xs whitespace-nowrap transform rotate-90 origin-center mt-2 text-green-400">
              TRADES
            </span>
          </div>
        </div>
      )}
      
      <div 
        ref={tradesRef} 
        className="h-[calc(100vh-48px)] overflow-y-auto p-2 bg-zinc-900/80 font-mono text-xs space-y-1.5 scrollbar-thin"
      >
        <div className="sticky top-0 bg-zinc-900 p-2 mb-1.5 rounded flex justify-between items-center z-10">
          <div className="text-green-400">
            {tradeQueueRef.current.length > 0 ? 
              `Queue: ${tradeQueueRef.current.length} trades` :
              'Waiting for trades...'
            }
          </div>
        </div>
        
        {trades.map((trade, index) => (
          <div 
            key={`${trade.hash}-${index}`} 
            className={`p-2 rounded bg-zinc-900/50 border border-zinc-800 
              ${trade.action === 'buy' ? 'text-green-400' : 
                trade.action === 'sell' ? 'text-red-400' : 
                trade.action === 'add_liquidity' ? 'text-purple-400' : 
                trade.action === 'remove_liquidity' ? 'text-orange-400' : 
                trade.action === 'zap' ? 'text-yellow-400' : 'text-zinc-400'} 
              ${trade.isNew ? 'new-trade-flash ' + (
                trade.action === 'buy' ? 'buy-flash' : 
                trade.action === 'sell' ? 'sell-flash' : 
                trade.action === 'add_liquidity' ? 'add-liquidity-flash' : 
                trade.action === 'remove_liquidity' ? 'remove-liquidity-flash' : 
                trade.action === 'zap' ? 'zap-flash' : ''
              ) : ''}`}
            onClick={() => window.open(`https://cardanoscan.io/transaction/${trade.hash}`, '_blank')}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold">{trade.token.ticker}</span>
              <span className="opacity-75 text-[11px]">
                {new Date(trade.time * 1000).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'})} {new Date(trade.time * 1000).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit', second:'2-digit', hour12: true})}
              </span>
            </div>
            <div className="flex justify-between items-center mt-0.5">
              <span>{formatNumber(Math.abs(trade.tokenAAmount))} {trade.token.ticker}</span>
              <span>₳{formatNumber(Math.abs(trade.tokenBAmount))}</span>
            </div>
            <div className="text-[11px] opacity-50 mt-0.5 hover:opacity-100 transition-opacity">
              {trade.exchange} • {trade.hash.slice(0, 8)}...{trade.hash.slice(-8)} ↗
            </div>
          </div>
        ))}
      </div>
      <style jsx global>{`
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
    </div>
  );
});

LiveTradeStream.displayName = 'LiveTradeStream';

export default LiveTradeStream;
