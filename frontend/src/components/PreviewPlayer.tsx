import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Download, Share2 } from 'lucide-react';

interface PreviewPlayerProps {
  trailerUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  quality?: string;
  onPlaybackTimeChange?: (time: number) => void;
  onDownload?: () => void;
  onShare?: () => void;
}

/**
 * Enhanced Preview Player Component
 * Plays trailer/preview videos with controls
 */
export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  trailerUrl,
  thumbnailUrl,
  duration,
  quality = '720p',
  onPlaybackTimeChange,
  onDownload,
  onShare
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bufferedTime, setBufferedTime] = useState(0);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value;
      setVolume(value);
      setIsMuted(value === 0);
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const current = (e.target as HTMLVideoElement).currentTime;
    setCurrentTime(current);
    onPlaybackTimeChange?.(current);
  };

  const handleLoadedMetadata = () => {
    setIsLoading(false);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleProgress = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    if (video.buffered.length > 0) {
      setBufferedTime(video.buffered.end(video.buffered.length - 1));
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen().catch((err) => {
          console.error('Fullscreen request failed:', err);
        });
      } else {
        document.exitFullscreen().catch((err) => {
          console.error('Exit fullscreen failed:', err);
        });
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = () => {
    if (duration) {
      return formatTime(duration);
    }
    if (videoRef.current?.duration) {
      return formatTime(videoRef.current.duration);
    }
    return '0:00';
  };

  if (error) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden group">
      {/* Video Container */}
      <div className="relative aspect-video bg-gray-900">
        <video
          ref={videoRef}
          src={trailerUrl}
          poster={thumbnailUrl}
          className="w-full h-full"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadStart={handleLoadStart}
          onProgress={handleProgress}
          onError={(e) => {
            setError('Failed to load video');
            console.error('Video error:', e);
          }}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}

        {/* Play Button Overlay */}
        {!isPlaying && !isLoading && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center group/play hover:bg-black/40 transition"
          >
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 group-hover/play:bg-white/30 transition">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </button>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="bg-gray-600 h-1 rounded-full cursor-pointer group/progress">
              <div
                className="bg-blue-500 h-1 rounded-full"
                style={{ width: `${(currentTime / (videoRef.current?.duration || 1)) * 100}%` }}
              />
              {bufferedTime > 0 && (
                <div
                  className="bg-gray-400 h-1 rounded-full opacity-50"
                  style={{ width: `${(bufferedTime / (videoRef.current?.duration || 1)) * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayPause}
                className="p-2 hover:bg-white/20 rounded transition"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white fill-white" />
                )}
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-1 hover:bg-white/10 px-2 py-1 rounded">
                <button onClick={handleMute} className="p-1">
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-gray-600 rounded cursor-pointer"
                />
              </div>

              {/* Time Display */}
              <div className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatDuration()}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quality Badge */}
              <span className="px-2 py-1 bg-white/10 rounded text-white text-xs font-semibold">
                {quality}
              </span>

              {/* Share Button */}
              <button
                onClick={onShare}
                className="p-2 hover:bg-white/20 rounded transition"
                title="Share"
              >
                <Share2 className="w-5 h-5 text-white" />
              </button>

              {/* Download Button */}
              <button
                onClick={onDownload}
                className="p-2 hover:bg-white/20 rounded transition"
                title="Download preview"
              >
                <Download className="w-5 h-5 text-white" />
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={handleFullscreen}
                className="p-2 hover:bg-white/20 rounded transition"
              >
                <Maximize className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPlayer;
