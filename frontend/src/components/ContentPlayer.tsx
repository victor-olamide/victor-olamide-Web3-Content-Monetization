'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

interface ContentPlayerProps {
  url: string;
  title: string;
  type: 'video' | 'music' | 'image' | 'article';
  thumbnail?: string;
}

export const ContentPlayer: React.FC<ContentPlayerProps> = ({
  url,
  title,
  type,
  thumbnail,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const handlePlayPause = () => {
    if (type === 'video' && videoRef.current) {
      isPlaying ? videoRef.current.pause() : videoRef.current.play();
      setIsPlaying(!isPlaying);
    } else if (type === 'music' && audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (type === 'video' && videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    } else if (type === 'music' && audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (type === 'video' && videoRef.current) {
      videoRef.current.volume = newVolume;
    } else if (type === 'music' && audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handlePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (type === 'video' && videoRef.current) {
      videoRef.current.playbackRate = speed;
    } else if (type === 'music' && audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen request failed:', err);
      }
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleTimeUpdate = () => {
    if (type === 'video' && videoRef.current) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    } else if (type === 'music' && audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (type === 'video' && videoRef.current) {
      setDuration(videoRef.current.duration);
    } else if (type === 'music' && audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickedPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const newTime = (clickedPercent / 100) * duration;

    if (type === 'video' && videoRef.current) {
      videoRef.current.currentTime = newTime;
    } else if (type === 'music' && audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (type === 'image') {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-black">
        <img src={url} alt={title} className="w-full h-auto max-h-[600px] object-contain" />
      </div>
    );
  }

  if (type === 'article') {
    return (
      <iframe
        src={url}
        title={title}
        className="w-full min-h-[600px] rounded-xl border border-gray-200"
      />
    );
  }

  if (type === 'video') {
    return (
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden bg-black group relative"
      >
        <video
          ref={videoRef}
          src={url}
          className="w-full h-auto max-h-[600px] object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          poster={thumbnail}
        />

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress Bar */}
          <div
            className="w-full h-1 bg-gray-600 rounded-full cursor-pointer hover:h-2 transition-all mb-4"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayPause}
                className="p-1 hover:bg-white/20 rounded transition"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <button
                onClick={handleMute}
                className="p-1 hover:bg-white/20 rounded transition"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1"
                aria-label="Volume"
              />

              <span className="text-xs text-gray-300 ml-2">
                {formatTime(duration * progress / 100)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={playbackSpeed}
                onChange={(e) => handlePlaybackSpeed(parseFloat(e.target.value))}
                className="text-xs bg-black/50 text-white px-2 py-1 rounded"
                aria-label="Playback speed"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>

              <button
                onClick={handleFullscreen}
                className="p-1 hover:bg-white/20 rounded transition"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'music') {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 p-8">
        <div className="flex flex-col items-center justify-center gap-6">
          {thumbnail && (
            <img
              src={thumbnail}
              alt={title}
              className="w-48 h-48 rounded-lg object-cover shadow-lg"
            />
          )}
          <h3 className="text-white text-xl font-semibold">{title}</h3>

          <audio
            ref={audioRef}
            src={url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="w-full"
            controls
          />

          <div className="w-full bg-white/20 rounded-full h-1 cursor-pointer" onClick={handleProgressClick}>
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayPause}
              className="bg-white text-purple-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>

          <div className="text-white text-sm text-center">
            {formatTime(duration * progress / 100)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ContentPlayer;
