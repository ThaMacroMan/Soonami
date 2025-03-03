import React, { useState, useEffect, useRef } from 'react';
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
  speedMultiplier,
  onLiveModeToggle,
  isLiveMode = false
}: TimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [formattedTime, setFormattedTime] = useState<string>('');
  const [absoluteTime, setAbsoluteTime] = useState<string>('');
  const [timeframeLabel, setTimeframeLabel] = useState<string>('');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [displayTime, setDisplayTime] = useState<number>(currentTime);
  const lastCurrentTimeRef = useRef<number>(currentTime);
  
  // Update displayTime when currentTime changes (but not during dragging)
  useEffect(() => {
    if (!isDragging) {
      setDisplayTime(currentTime);
    }
    lastCurrentTimeRef.current = currentTime;
  }, [currentTime, isDragging]);
  
  // Format times on the client side only to avoid hydration mismatch
  useEffect(() => {
    // Use displayTime instead of currentTime for formatting
    const timeToFormat = displayTime;
    
    // Relative time formatting
    const now = Math.floor(Date.now() / 1000);
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

  // Handle mouse down for drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click event from firing
    
    // Calculate initial drag time
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const timeAtPosition = Math.floor(startTime + (endTime - startTime) * percentage);
      
      // Set the display time immediately to prevent flicker
      setDisplayTime(timeAtPosition);
      
      // Then set dragging state
      setIsDragging(true);
    }
    
    // Prevent text selection during dragging
    e.preventDefault();
  };

  // Handle mouse move during drag and for hover time display
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const timeAtPosition = Math.floor(startTime + (endTime - startTime) * percentage);
    
    if (isDragging) {
      // Update display time during dragging
      setDisplayTime(timeAtPosition);
    } else {
      setHoverTime(timeAtPosition);
    }
  };

  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    if (isDragging) {
      // Apply the time change
      onTimeChange(displayTime);
      setIsDragging(false);
    }
  };

  // Add global event listeners when dragging starts
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!sliderRef.current) return;
        
        const rect = sliderRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = Math.floor(startTime + (endTime - startTime) * percentage);
        
        // Update display time during dragging
        setDisplayTime(newTime);
      };
      
      const handleGlobalMouseUp = () => {
        if (isDragging) {
          // Apply the time change
          onTimeChange(displayTime);
          setIsDragging(false);
        }
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, startTime, endTime, onTimeChange, displayTime]);

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
    const now = Math.floor(Date.now() / 1000);
    
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

  // Toggle LIVE mode
  const handleLiveModeToggle = () => {
    if (onLiveModeToggle) {
      onLiveModeToggle(!isLiveMode);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-[1200px] bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-4">
        {/* 15-minute Backward Button */}
        <button
          onClick={() => adjust15Minutes('backward')}
          className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
          title="Go back 15 minutes"
          disabled={isLiveMode}
        >
          <BackwardIcon className="w-4 h-4 text-white" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={() => onPlayPause(!isPlaying)}
          className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
          disabled={isLiveMode}
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
          disabled={isLiveMode}
        >
          <ForwardIcon className="w-4 h-4 text-white" />
        </button>

        {/* LIVE MODE Button */}
        <button
          onClick={handleLiveModeToggle}
          className={`flex items-center justify-center px-3 py-1.5 rounded-lg transition-colors ${
            isLiveMode 
              ? 'bg-red-600 hover:bg-orange-700 text-white' 
              : 'bg-zinc-800 hover:bg-zinc-700 text-white'
          }`}
          title="Toggle live mode"
        >
          <BoltIcon className="w-4 h-4 mr-1" />
          {isLiveMode ? 'LIVE' : 'LIVE MODE'}
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
        <div className={`flex-1 relative ${isLiveMode ? 'opacity-50 pointer-events-none' : ''}`}>
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
          </div>
          
          {/* Drag instruction */}
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-zinc-400">
            {isLiveMode ? 'Live Mode - Timeline disabled' : 'Drag the handle to change time'}
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