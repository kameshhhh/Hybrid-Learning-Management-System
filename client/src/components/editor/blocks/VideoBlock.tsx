import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Lock, AlertCircle, Upload, Loader2, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAssetUrl } from '@/lib/utils';
import { uploadService } from '@/services/upload';
import { Button } from '@/components/ui';
import { now } from '@/services/time';
import { syncProgress } from '@/services/syncService';

interface VideoBlockProps {
  id: string;
  content: { url: string; provider: 'upload' | 'youtube'; caption?: string };
  meta?: { isLocked: boolean; requiredWatch: number };
  isEditable?: boolean;
  isStudent?: boolean;
  onUpdate?: (content: any, meta?: any) => void;
  onProgress?: (percentage: number, position: number) => void;
  onComplete?: () => void;
  initialPosition?: number;
  chapterId?: string;
  skillId?: string;
}

export const VideoBlock = React.memo<VideoBlockProps>(({
  id,
  content,
  meta = { isLocked: false, requiredWatch: 90 },
  isEditable,
  isStudent,
  onUpdate,
  onProgress,
  onComplete,
  initialPosition = 0,
  chapterId,
  skillId
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxWatchedRef = useRef(initialPosition);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const lastSyncTimeRef = useRef(0);
  const restoreUntilRef = useRef(0);
  const youtubePlayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAbuseDetected, setIsAbuseDetected] = useState(false);

  // Stable sync identity for this block instance
  const syncId = useRef(crypto.randomUUID());

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const loadingToast = toast.loading("Uploading video...");

      const res = await uploadService.uploadVideo(file);

      if (res.success) {
        onUpdate?.({
          ...content,
          url: res.data.url,
          provider: 'upload'
        });
        toast.success("Video uploaded successfully!", { id: loadingToast });
      } else {
        toast.error("Upload failed", { id: loadingToast });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || "Error uploading video");
    } finally {
      setIsUploading(false);
    }
  };

  // Builder Mode
  if (isEditable) {
    return (
      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden group relative">
        <div className="aspect-video bg-black flex items-center justify-center rounded-lg border border-slate-700">
          {content.url ? (
            <div className="text-slate-500 flex flex-col items-center">
              <Play size={48} className="opacity-20 mb-2" />
              <p className="text-xs uppercase tracking-widest font-semibold">Video Preview Available</p>
            </div>
          ) : (
            <div className="text-slate-600 flex flex-col items-center">
              <AlertCircle size={48} className="opacity-20 mb-2" />
              <p className="text-xs uppercase tracking-widest font-semibold">No Video Selected</p>
            </div>
          )}
        </div>
        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Video URL (S3 or Youtube)"
                value={content.url || ''}
                onChange={(e) => onUpdate?.({ ...content, url: e.target.value, provider: e.target.value.includes('youtube') || e.target.value.includes('youtu.be') ? 'youtube' : 'upload' })}
                className="w-full bg-slate-800 border-none text-white text-sm rounded-lg pl-3 pr-10 py-2 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
                {content.provider === 'youtube' ? <Play size={16} /> : <Video size={16} />}
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="video/mp4,video/webm,video/quicktime"
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            </Button>
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 text-xs text-slate-400 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={meta.isLocked}
                onChange={(e) => onUpdate?.(content, { ...meta, isLocked: e.target.checked })}
                className="rounded bg-slate-700 border-none text-blue-500"
              />
              LOCKED (Sequential)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Require:</span>
              <input
                type="number"
                min="0" max="100"
                value={meta.requiredWatch}
                onChange={(e) => onUpdate?.(content, { ...meta, requiredWatch: parseInt(e.target.value) })}
                className="w-12 bg-slate-800 border-none text-white text-[10px] rounded px-1 text-center py-0.5 outline-none"
              />
              <span className="text-[10px] text-slate-500 font-bold">%</span>
            </div>
          </div>

          <input
            type="text"
            placeholder="Add a video title or caption (e.g. Fig 1.2: Welding Process)..."
            value={content.caption || ''}
            onChange={(e) => onUpdate?.({ ...content, caption: e.target.value })}
            className="w-full text-center text-xs text-slate-400 bg-slate-800/50 border-none rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 outline-none italic"
          />
        </div>
      </div>
    );
  }

  // 1. INITIALIZATION & RESTORE SECURITY LAYER
  useEffect(() => {
    if (initialPosition > 0) {
      restoreUntilRef.current = now() + 200;
      maxWatchedRef.current = initialPosition;
      
      if (videoRef.current) {
        videoRef.current.currentTime = initialPosition;
      }
    }
  }, [initialPosition]);

  // Visibility and Visibility-related Security
  useEffect(() => {
    if (!isStudent) return;

    let blurTimeout: any;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (videoRef.current) videoRef.current.pause();
        if (youtubePlayerRef.current) youtubePlayerRef.current.pauseVideo();
        setIsAbuseDetected(true);
        toast("Video paused: Stay focused on the tab!", { icon: "⏸️", id: 'visibility-alert' });
      } else {
        setIsAbuseDetected(false);
      }
    };

    const handleBlur = () => {
      blurTimeout = setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
        if (youtubePlayerRef.current) youtubePlayerRef.current.pauseVideo();
        setIsAbuseDetected(true);
        toast.error("Focus lost! Stay on the video.", { id: 'blur-alert' });
      }, 2000);
    };

    const handleFocus = () => {
      clearTimeout(blurTimeout);
      setIsAbuseDetected(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      clearTimeout(blurTimeout);
    };
  }, [isStudent]);

  // Security Controller: Scoped to container
  useEffect(() => {
    if (!isStudent || !containerRef.current) return;

    const container = containerRef.current;
    let violationCount = 0;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error("Content copying is restricted!", { id: 'security-copy' });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.error("Right-click is restricted on protected content!", { id: 'security-context' });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      
      if (
        (isCmdOrCtrl && ['c', 'u', 's', 'p'].includes(key)) ||
        (isCmdOrCtrl && e.shiftKey && ['i', 'c', 'j'].includes(key)) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        toast.error("Shortcut restricted!", { id: 'security-key' });
      }
    };

    const checkDevTools = () => {
      const threshold = 160;
      const isDevToolsOpen = 
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold;

      if (isDevToolsOpen) {
        violationCount++;
        if (violationCount > 3) {
          if (videoRef.current) videoRef.current.pause();
          if (youtubePlayerRef.current) youtubePlayerRef.current.pauseVideo();
          setIsAbuseDetected(true);
          toast.error("Inspection tools detected!", { id: 'devtools-alert' });
        }
      } else {
        violationCount = 0;
      }
    };

    container.addEventListener("copy", handleCopy as any);
    container.addEventListener("contextmenu", handleContextMenu as any);
    container.addEventListener("keydown", handleKeyDown as any);
    const devToolsInterval = setInterval(checkDevTools, 1000);

    return () => {
      container.removeEventListener("copy", handleCopy as any);
      container.removeEventListener("contextmenu", handleContextMenu as any);
      container.removeEventListener("keydown", handleKeyDown as any);
      clearInterval(devToolsInterval);
    };
  }, [isStudent]);

  // 5. MISSION-GRADE SYNC ENGINE (Tiered Transport)
  const performSync = useCallback(async (currentTime: number, options: { force?: boolean } = {}) => {
    if (!isStudent || !skillId || !id) return;

    const currentTimeStamp = now();
    
    if (!options.force && (currentTimeStamp - lastSyncTimeRef.current < 5000)) return;

    const duration = videoRef.current?.duration || youtubePlayerRef.current?.getDuration() || 1;
    const percentage = Math.floor((maxWatchedRef.current / (duration || 1)) * 100);

    const payload = {
      skillId,
      dayId: chapterId || '',
      blockId: id,
      progress: Math.round(currentTime),
      percentage,
      timestamp: currentTimeStamp,
      syncId: syncId.current,
      sessionId: 'global-session' // Session handled at transport/arbiter level
    };

    lastSyncTimeRef.current = currentTimeStamp;
    await syncProgress(payload, options);
  }, [isStudent, skillId, id, chapterId]);

  useEffect(() => {
    const handleFlush = () => {
       const currentTime = videoRef.current?.currentTime || youtubePlayerRef.current?.getCurrentTime() || 0;
       performSync(currentTime, { force: true });
    };

    document.addEventListener('hlms:flush_progress', handleFlush);
    return () => document.removeEventListener('hlms:flush_progress', handleFlush);
  }, [performSync]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || !isStudent) return;
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    const isRestoring = now() < restoreUntilRef.current;
    
    if (!isRestoring && currentTime > maxWatchedRef.current + 2.0) {
      videoRef.current.currentTime = maxWatchedRef.current;
      toast.error("Skipping ahead is restricted!", { id: 'native-skip' });
    } else {
      if (currentTime > maxWatchedRef.current) {
        if (currentTime <= maxWatchedRef.current + 3.0 || isRestoring) {
          maxWatchedRef.current = currentTime;
        }
      }

      if (duration > 0) {
        const percentage = (maxWatchedRef.current / duration) * 100;
        
        const report = () => {
          onProgress?.(percentage, maxWatchedRef.current);
          performSync(currentTime);
        };

        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(report);
        } else {
          setTimeout(report, 0);
        }

        if (percentage >= meta.requiredWatch && !isCompleted) {
          setIsCompleted(true);
          onComplete?.();
          performSync(currentTime, { force: true });
        }
      }
    }
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleRateChange = () => {
    if (videoRef.current && videoRef.current.playbackRate > 1.25) {
      videoRef.current.playbackRate = 1.0;
      toast.error("Playback speed restricted to 1.25x", { id: 'rate-limit' });
    }
  };

  const handleSeeking = () => {
    if (!videoRef.current) return;
    if (videoRef.current.currentTime > maxWatchedRef.current + 1) {
      videoRef.current.currentTime = maxWatchedRef.current;
      toast.error("No skipping allowed!", { id: 'seeking-limit' });
    }
  };

  const videoUrl = getAssetUrl(content.url);
  const isYoutubeLink = content.url?.includes('youtube.com') || content.url?.includes('youtu.be');
  const youtubeId = isYoutubeLink ? getYoutubeId(content.url) : (content.provider === 'youtube' ? getYoutubeId(content.url) : null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const windowAny = window as any;
    if (!youtubeId || !windowAny.YT || !windowAny.YT.Player) return;

    let interval: any;

    const onPlayerStateChange = (event: any) => {
      const windowAny = window as any;
      if (event.data === windowAny.YT.PlayerState.PLAYING) {
        const currentTime = event.target.getCurrentTime();
        if (currentTime > maxWatchedRef.current + 2) {
          event.target.seekTo(maxWatchedRef.current, true);
          toast.error("Skipping ahead is restricted!", { id: 'yt-state-skip' });
        }
      }
    };

    const onPlayerReady = (event: any) => {
      youtubePlayerRef.current = event.target;
      if (initialPosition > 0) {
        event.target.seekTo(initialPosition, true);
        maxWatchedRef.current = initialPosition;
      }

      interval = setInterval(() => {
        const currentTime = event.target.getCurrentTime();
        const duration = event.target.getDuration();
        const isRestoring = now() < restoreUntilRef.current;

          if (!isRestoring && currentTime > maxWatchedRef.current + 2.5) {
            event.target.seekTo(maxWatchedRef.current, true);
            toast.error("Skipping ahead is restricted!", { id: 'yt-skip' });
          } else {
            if (currentTime > maxWatchedRef.current) {
               if (currentTime <= maxWatchedRef.current + 4.0 || isRestoring) {
                  maxWatchedRef.current = currentTime;
               }
            }
            
            if (duration > 0 && isStudent) {
              const percentage = (maxWatchedRef.current / duration) * 100;
              
              const report = () => {
                onProgress?.(percentage, maxWatchedRef.current);
                performSync(currentTime);
              };

              if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(report);
              } else {
                setTimeout(report, 0);
              }

              if (percentage >= meta.requiredWatch && !isCompleted) {
                setIsCompleted(true);
                onComplete?.();
                performSync(currentTime, { force: true });
              }
            }
          }
        }, 500); 
    };

    const newPlayer = new windowAny.YT.Player(`yt-player-${content.url.replace(/[^a-zA-Z0-9]/g, '')}`, {
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange,
      }
    });

    return () => {
      if (interval) clearInterval(interval);
      if (newPlayer && newPlayer.destroy) newPlayer.destroy();
    };
  }, [youtubeId]);

  useEffect(() => {
    const windowAny = window as any;
    if (youtubeId && !windowAny.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, [youtubeId]);

  return (
    <div className="my-8" ref={containerRef}>
      <div 
        className={`aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-200 relative group transition-all duration-500 ${
          isAbuseDetected ? 'blur-xl scale-[0.98]' : ''
        }`}
      >
        {youtubeId ? (
          <div className="w-full h-full relative">
            <iframe
              id={`yt-player-${content.url.replace(/[^a-zA-Z0-9]/g, '')}`}
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&enablejsapi=1&controls=1&fs=0&disablekb=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : content.url ? (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full"
              controls
              crossOrigin="anonymous"
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              onLoadedMetadata={() => {
                if (initialPosition > 0 && videoRef.current) {
                  videoRef.current.currentTime = initialPosition;
                  maxWatchedRef.current = initialPosition;
                }
              }}
              onTimeUpdate={handleTimeUpdate}
              onSeeking={handleSeeking}
              onRateChange={handleRateChange}
              onError={() => setLoadError(true)}
              onEnded={() => {
                setIsCompleted(true);
                onComplete?.();
              }}
            />
            {loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white p-6 text-center">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h3 className="text-lg font-bold mb-2">Video Unreachable</h3>
                <p className="text-slate-400 text-sm max-w-xs">
                  This video file could not be loaded.
                </p>
                <Button
                  variant="ghost"
                  className="mt-4 text-white"
                  onClick={() => { setLoadError(false); if (videoRef.current) videoRef.current.load(); }}
                >
                  Retry Loading
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <Video size={48} className="opacity-20 mb-4" />
            <p className="text-sm font-medium">No video content available</p>
          </div>
        )}

        {!isCompleted && meta.isLocked && isStudent && (
          <div className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white/80 pointer-events-none">
            <Lock size={16} />
          </div>
        )}
      </div>
      {content.caption && (
        <div className="mt-4 text-center">
          <p className="text-sm text-slate-500 font-medium italic tracking-tight">
            {content.caption}
          </p>
        </div>
      )}
    </div>
  );
});
