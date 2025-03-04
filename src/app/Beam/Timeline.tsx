import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayIcon, PauseIcon, BackwardIcon, ForwardIcon, BoltIcon } from '@heroicons/react/24/solid';

interface TimelineProps {
  startTime: number; // Unix timestamp in seconds
  endTime: number; // Unix timestamp in seconds
  currentTime: number; // Unix timestamp in seconds
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlayPause: (isPlaying: boolean) => void;
  speedMultiplier: number;
  onLiveModeToggle?: (isLiveMode: boolean) => void;
  isLiveMode?: boolean;
}

export function Timeline({
  startTime,
  endTime,
  currentTime,
  isPlaying,
  onTimeChange,
  onPlayPause,
  onLiveModeToggle,
  isLiveMode = false
}: TimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [, setDragStartTime] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [, setFormattedTime] = useState<string>('');
  const [absoluteTime, setAbsoluteTime] = useState<string>('');
  const [, setTimeframeLabel] = useState<string>('');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [displayTime, setDisplayTime] = useState<number>(currentTime);
  const lastCurrentTimeRef = useRef<number>(currentTime);
  const lastDragTimeRef = useRef<number | null>(null);
  const lockTimeUpdateRef = useRef<boolean>(false);
  const userSetTimeRef = useRef<number | null>(null);
  const [isNearLiveTime, setIsNearLiveTime] = useState(false);
  
  // Get the current time in seconds
  const getCurrentTime = (): number => {
    return Math.floor(Date.now() / 1000);
  };
  
  // Check if we're within 5 minutes of the current time
  useEffect(() => {
    // Get the actual current time in seconds
    const now = getCurrentTime();
    const isWithinFiveMinutes = now - displayTime < 300; // 5 minutes = 300 seconds
    setIsNearLiveTime(isWithinFiveMinutes);
    
    // If we're near live time and not already in live mode, we could optionally auto-enable it
    if (isWithinFiveMinutes && !isLiveMode && onLiveModeToggle && !isDragging && !lockTimeUpdateRef.current) {
      // Uncomment to auto-enable live mode when near current time
      // onLiveModeToggle(true);
    }
  }, [displayTime, isLiveMode, onLiveModeToggle, isDragging]);
  
  // Update displayTime when currentTime changes, but respect user interactions
  useEffect(() => {
    // Only update if we're not in a locked state from user interaction
    if (!isDragging && !lockTimeUpdateRef.current) {
      setDisplayTime(currentTime);
    }
    lastCurrentTimeRef.current = currentTime;
  }, [currentTime, isDragging]);

  // Calculate time from mouse position
  const calculateTimeFromPosition = useCallback((clientX: number): number => {
    if (!sliderRef.current) return currentTime;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.floor(startTime + (endTime - startTime) * percentage);
  }, [startTime, endTime, currentTime]);

  // Handle mouse down for drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Lock updates from currentTime prop
    lockTimeUpdateRef.current = true;
    
    const newTime = calculateTimeFromPosition(e.clientX);
    setDragStartTime(newTime);
    setDisplayTime(newTime);
    setIsDragging(true);
    lastDragTimeRef.current = newTime;
    userSetTimeRef.current = newTime;
  };

  // Handle mouse move during drag and for hover time display
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    
    const newTime = calculateTimeFromPosition(e.clientX);
    
    if (isDragging) {
      setDisplayTime(newTime);
      lastDragTimeRef.current = newTime;
      userSetTimeRef.current = newTime;
    } else {
      setHoverTime(newTime);
    }
  };

  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    if (isDragging && userSetTimeRef.current !== null) {
      const finalTime = userSetTimeRef.current;
      
      // Call onTimeChange with the final position
      onTimeChange(finalTime);
      
      // Update state
      setIsDragging(false);
      setDragStartTime(null);
      
      // Keep the lock active for a while to prevent jumps
      setTimeout(() => {
        // Only unlock if no new drag has started
        if (!isDragging) {
          lockTimeUpdateRef.current = false;
        }
      }, 2000);
    }
  };

  // Add global event listeners when dragging starts
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!sliderRef.current) return;
        
        const newTime = calculateTimeFromPosition(e.clientX);
        setDisplayTime(newTime);
        lastDragTimeRef.current = newTime;
        userSetTimeRef.current = newTime;
      };
      
      const handleGlobalMouseUp = () => {
        if (isDragging && userSetTimeRef.current !== null) {
          const finalTime = userSetTimeRef.current;
          
          // Call onTimeChange with the final position
          onTimeChange(finalTime);
          
          // Update state
          setIsDragging(false);
          setDragStartTime(null);
          
          // Keep the lock active for a while to prevent jumps
          setTimeout(() => {
            // Only unlock if no new drag has started
            if (!isDragging) {
              lockTimeUpdateRef.current = false;
            }
          }, 2000);
        }
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, calculateTimeFromPosition, onTimeChange]);

  // Ensure we unlock if component unmounts while locked
  useEffect(() => {
    return () => {
      lockTimeUpdateRef.current = false;
    };
  }, []);

  // Format times on the client side only to avoid hydration mismatch
  useEffect(() => {
    // Use displayTime instead of currentTime for formatting
    const timeToFormat = displayTime;
    
    // Relative time formatting
    const now = getCurrentTime();
    const diff = now - timeToFormat;
    
    let relativeTime;
    if (diff < 60) {
      relativeTime = 'Just now';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      relativeTime = `${minutes}m ago`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      relativeTime = `${hours}h ago`;
    } else {
      const days = Math.floor(diff / 86400);
      relativeTime = `${days}d ago`;
    }
    
    // Absolute time formatting
    const date = new Date(timeToFormat * 1000);
    const absoluteTimeStr = date.toLocaleString();
    
    // Determine timeframe label based on how far back we're looking
    const timeDiff = now - timeToFormat;
    let timeframe = '30d'; // Always default to 30d
    
    // Only change the timeframe label if we're looking at a more recent time
    if (timeDiff < 3600) {
      timeframe = '1h';
    } else if (timeDiff < 86400) {
      timeframe = '24h';
    } else if (timeDiff < 86400 * 3) {
      timeframe = '3d';
    } else if (timeDiff < 86400 * 7) {
      timeframe = '7d';
    }
    
    setFormattedTime(relativeTime);
    setAbsoluteTime(absoluteTimeStr);
    setTimeframeLabel(timeframe);
  }, [displayTime]);

  const getPercentage = (time: number) => {
    // Ensure we don't get NaN or Infinity
    if (endTime === startTime) return 0;
    const percentage = ((time - startTime) / (endTime - startTime)) * 100;
    // Clamp percentage between 0 and 100
    return Math.max(0, Math.min(100, percentage));
  };

  // Format a timestamp for display
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle 15-minute time adjustments
  const adjust15Minutes = (direction: 'forward' | 'backward') => {
    const fifteenMinutesInSeconds = 15 * 60;
    const newTime = direction === 'forward' 
      ? currentTime + fifteenMinutesInSeconds 
      : currentTime - fifteenMinutesInSeconds;
    
    // Ensure we don't go beyond the timeline bounds
    const boundedTime = Math.max(startTime, Math.min(endTime, newTime));
    onTimeChange(boundedTime);
  };

  // Generate time markers based on API timeframes
  const getTimeMarkers = () => {
    const markers: { time: number; label: string; isApiTimeframe?: boolean }[] = [];
    const now = getCurrentTime();
    
    // Add markers for standard API timeframes
    const timeframes = [
      { label: '1h', seconds: 3600 },
      { label: '24h', seconds: 86400 },
      { label: '3d', seconds: 86400 * 3 },
      { label: '7d', seconds: 86400 * 7 },
      { label: '30d', seconds: 86400 * 30 }
    ];

    
    // Add API timeframe markers
    timeframes.forEach(tf => {
      const markerTime = now - tf.seconds;
      if (markerTime >= startTime) {
        markers.push({
          time: markerTime,
          label: tf.label,
          isApiTimeframe: true
        });
      }
    });
    
    return markers;
  };

  // Handle live mode toggle
  const handleLiveModeToggle = () => {
    if (onLiveModeToggle) {
      // If enabling live mode, set the time to 5 minutes before current time
      if (!isLiveMode) {
        // Get the current time in seconds
        const now = getCurrentTime();
        console.log("Timeline: Current time:", new Date(now * 1000).toLocaleString());
        
        const fiveMinutesAgo = now - 300; // 5 minutes = 300 seconds
        console.log("Timeline: Five minutes ago:", new Date(fiveMinutesAgo * 1000).toLocaleString());
        
        // Force update the timeline position to the current time minus 5 minutes
        setDisplayTime(fiveMinutesAgo);
        
        // Call onTimeChange first to update the time
        onTimeChange(fiveMinutesAgo);
        
        // Then enable live mode with a small delay to ensure time change is processed first
        setTimeout(() => {
          console.log("Timeline: Enabling live mode");
          onLiveModeToggle(true);
        }, 50);
      } else {
        // Just toggle live mode off if it's already on
        console.log("Timeline: Disabling live mode");
        onLiveModeToggle(false);
      }
    }
  };

  // Keep time updated when in live mode
  useEffect(() => {
    if (isLiveMode) {
      // When entering live mode, immediately set to current time - 5 minutes
      const now = getCurrentTime();
      const fiveMinutesAgo = now - 300;
      setDisplayTime(fiveMinutesAgo);
      onTimeChange(fiveMinutesAgo);
      
      // Set up an interval to keep updating the time every second in live mode
      const intervalId = setInterval(() => {
        const currentNow = getCurrentTime();
        const currentFiveMinutesAgo = currentNow - 300;
        setDisplayTime(currentFiveMinutesAgo);
        onTimeChange(currentFiveMinutesAgo);
      }, 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [isLiveMode, onTimeChange]);

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-[1200px] bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-4">
        {/* 15-minute Backward Button */}
        <button
          onClick={() => adjust15Minutes('backward')}
          className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
          title="Go back 15 minutes"
        >
          <BackwardIcon className="w-4 h-4 text-white" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={() => onPlayPause(!isPlaying)}
          className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
        >
          {isPlaying ? (
            <PauseIcon className="w-5 h-5 text-white" />
          ) : (
            <PlayIcon className="w-5 h-5 text-white" />
          )}
        </button>

        {/* 15-minute Forward Button */}
        <button
          onClick={() => adjust15Minutes('forward')}
          className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
          title="Go forward 15 minutes"
        >
          <ForwardIcon className="w-4 h-4 text-white" />
        </button>

        {/* LIVE MODE Button */}
        <button
          onClick={handleLiveModeToggle}
          className={`flex items-center justify-center px-3 py-1.5 rounded-lg transition-colors ${
            isLiveMode || isNearLiveTime 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-zinc-800 hover:bg-zinc-700 text-white'
          }`}
          title={isLiveMode ? "Live mode active" : "Click to enable live mode"}
        >
          <BoltIcon className={`h-4 w-4 mr-1 ${
            isLiveMode || isNearLiveTime ? 'text-white' : 'text-gray-400'
          }`} />
          {(isLiveMode || isNearLiveTime) && (
            <span className="ml-1 text-xs text-white">LIVE</span>
          )}
        </button>

  
          {/* Absolute time tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {absoluteTime}
          </div>
    



        {/* Current Time Display */}
        <div className="text-white text-sm font-mono ml-auto bg-zinc-800 px-3 py-1 rounded-md">
          {formatTimestamp(displayTime)}
        </div>

        {/* Timeline Slider Container */}
        <div className="flex-1 relative">
          {/* Timeline Slider */}
          <div
            ref={sliderRef}
            className="h-2 bg-zinc-800 rounded-full relative group"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {/* Progress Bar */}
            <div
              className="absolute h-full bg-blue-500 rounded-full"
              style={{ width: `${getPercentage(displayTime)}%` }}
            />
            
            {/* Current Position Indicator */}
            <div
              ref={handleRef}
              className={`absolute w-4 h-4 bg-white rounded-full -top-1 -ml-2 border-2 border-blue-500 transition-transform ${isDragging ? 'scale-125' : 'group-hover:scale-110'} cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
              style={{ left: `${getPercentage(displayTime)}%` }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
            />

            {/* Dragging Time Tooltip */}
            {isDragging && (
              <div 
                className="absolute -top-8 px-2 py-1 bg-blue-600 rounded text-xs text-white whitespace-nowrap transform -translate-x-1/2 pointer-events-none font-bold"
                style={{ left: `${getPercentage(displayTime)}%` }}
              >
                {formatTimestamp(displayTime)}
              </div>
            )}

            {/* Hover Time Tooltip */}
            {isHovering && hoverTime && !isDragging && (
              <div 
                className="absolute -top-8 px-2 py-1 bg-zinc-800 rounded text-xs text-white whitespace-nowrap transform -translate-x-1/2 pointer-events-none"
                style={{ left: `${getPercentage(hoverTime)}%` }}
              >
                {formatTimestamp(hoverTime)}
              </div>
            )}

            {/* Time markers */}
            {getTimeMarkers().map((marker, index) => (
              <div
                key={index}
                className={`absolute w-px h-1 ${marker.isApiTimeframe ? 'bg-blue-500' : 'bg-zinc-600'} top-0.5`}
                style={{ left: `${getPercentage(marker.time)}%` }}
              >
                <div className={`absolute top-3 left-1/2 transform -translate-x-1/2 text-xs ${marker.isApiTimeframe ? 'text-blue-400 font-bold' : 'text-zinc-400'} whitespace-nowrap`}>
                  {marker.label}
                </div>
              </div>
            ))}

            {/* Drag instruction */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-zinc-400">
              Drag the handle to change time
            </div>
          </div>
          

        </div>
      </div>
      
      {/* Loading indicator when dragging */}
      {isDragging && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-blue-900/80 text-white px-4 py-2 rounded-lg z-50 text-sm">
          Dragging to {formatTimestamp(displayTime)}
        </div>
      )}
      
    </div>
  );
} 