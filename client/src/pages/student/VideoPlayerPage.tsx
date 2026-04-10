import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentService } from "@/services/student";
import { socketService } from "@/services/socket";
import {
  GlassCard,
  GlassCardContent,
  Badge,
  Button
} from "@/components/ui";
import { 
  ArrowLeft, 
  CheckCircle, 
  FileDown, 
  FileText, 
  Target, 
  Award, 
  Wrench, 
  BookOpen, 
  ClipboardCheck 
} from "lucide-react";
import toast from "react-hot-toast"; 
import DOMPurify from "dompurify";
import { Tabs } from "@/components/ui/Tabs";
import { getAssetUrl } from "@/lib/utils";

const VideoPlayerPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lessonData, setLessonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchLesson();
  }, [lessonId]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const res = await studentService.getLesson(lessonId as string);
      if (res.success) {
        setLessonData(res.data);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || "Failed to load lesson");
      navigate("/student/skills");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Security: Detect and Block Cheating
  const maxWatchedRef = useRef(0);
  const previousTimeRef = useRef(0);
  const lastSyncTimeRef = useRef(0);

  // Visibility Handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        toast("Video paused as tab is hidden", { icon: "⏸️" });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Sync Progress periodically (Every 10% or 10s)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (videoRef.current && lessonData && !videoRef.current.paused && !videoRef.current.ended) {
        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
        
        // Only sync if we've progressed at least 5% or 10s since last sync
        if (Math.abs(currentTime - lastSyncTimeRef.current) >= 10 || Math.abs(percentage - (lastSyncTimeRef.current / duration * 100)) >= 5) {
          lastSyncTimeRef.current = currentTime;
          try {
            socketService.emit("video:progress", {
               lessonId: lessonId,
               skillId: lessonData.lesson.skillId,
               percentage: Math.round(percentage),
               position: currentTime,
               maxWatched: maxWatchedRef.current
            });
          } catch (e) {
            console.error("Progress emit error");
          }
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [lessonId, lessonData]);

  const handleEnded = async () => {
     try {
       // Mark 100% completion
       await studentService.updateVideoProgress(lessonId as string, 100, videoRef.current?.duration || 0);
       toast.success("Lesson Complete!", { icon: "🎉" });
       fetchLesson(); // Refresh to show completed state
     } catch(e) {}
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && lessonData?.progress) {
       const startPos = lessonData.progress.lastWatchPosition || 0;
       videoRef.current.currentTime = startPos;
       maxWatchedRef.current = lessonData.progress.maxWatchedTime || startPos;
       previousTimeRef.current = startPos;
       lastSyncTimeRef.current = startPos;
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    // 1. Lock Playback Rate (max 1.25x)
    if (videoRef.current.playbackRate > 1.25) {
      videoRef.current.playbackRate = 1.0;
      toast.error("Cheating detected: Playback rate restricted to 1.25x max");
    }

    // 2. Prevent skipping ahead
    if (!videoRef.current.seeking) {
      if (videoRef.current.currentTime > maxWatchedRef.current + 2) {
        videoRef.current.currentTime = maxWatchedRef.current;
        toast.error("Skipping ahead is not allowed!");
      } else {
        previousTimeRef.current = videoRef.current.currentTime;
        if (videoRef.current.currentTime > maxWatchedRef.current) {
          maxWatchedRef.current = videoRef.current.currentTime;
        }
      }
    }
  };

  const handleRateChange = () => {
    if (videoRef.current && videoRef.current.playbackRate > 1.25) {
      videoRef.current.playbackRate = 1.0;
    }
  };

  const handleSeeking = () => {
    if (!videoRef.current) return;
    if (videoRef.current.currentTime > maxWatchedRef.current + 1) {
      videoRef.current.currentTime = maxWatchedRef.current;
      toast.error("Seeking forward is restricted. Watch the content to finish.");
    }
  };

  if (loading) return <p className="mt-8 text-center text-slate-500">Loading video...</p>;
  if (!lessonData) return null;

  const { lesson, progress } = lessonData;
  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoUrl = getAssetUrl(lesson.videoUrl);
  // Smarter detection: prioritize content URL matching youtube patterns
  const isYoutubeLink = lesson.videoUrl?.includes('youtube.com') || lesson.videoUrl?.includes('youtu.be');
  const youtubeId = isYoutubeLink ? getYoutubeId(lesson.videoUrl) : null;
  const [loadError, setLoadError] = useState(false);

  // YouTube API Integration
  useEffect(() => {
    const windowAny = window as any;
    if (!youtubeId || !windowAny.YT || !windowAny.YT.Player) return;

    let interval: any;

    const onPlayerReady = (event: any) => {
      interval = setInterval(() => {
        const currentTime = event.target.getCurrentTime();
        const duration = event.target.getDuration();

        if (currentTime > maxWatchedRef.current + 2) {
          event.target.seekTo(maxWatchedRef.current, true);
          toast.error("No skipping allowed!", { id: 'yt-skip' });
        } else {
          maxWatchedRef.current = Math.max(maxWatchedRef.current, currentTime);

          // Report progress for YouTube
          if (duration > 0) {
            const percentage = (maxWatchedRef.current / duration) * 100;
            
            // Sync via socket
            socketService.emit("video:progress", {
               lessonId: lessonId,
               skillId: lesson.skillId,
               percentage: Math.round(percentage),
               position: maxWatchedRef.current,
               maxWatched: maxWatchedRef.current
            });

            if (percentage >= 95) {
               handleEnded();
            }
          }
        }
      }, 5000); // 5s interval for YouTube stability
    };

    const newPlayer = new windowAny.YT.Player(`yt-player-${lessonId}`, {
      events: {
        'onReady': onPlayerReady,
      }
    });

    return () => {
      if (interval) clearInterval(interval);
      if (newPlayer && newPlayer.destroy) newPlayer.destroy();
    };
  }, [youtubeId]);

  // Load YouTube API if not present
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
    <div className="space-y-6">
      <div className="mb-4 flex gap-4 items-center">
        <Button variant="ghost" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
      
      <GlassCard variant="secondary" padding="lg">
        <div className="mb-4">
           <Badge variant="purple" className="mb-2">{lesson.chapterTitle}</Badge>
           <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
             {lesson.title}
           </h1>
           {progress?.isCompleted && (
             <Badge variant="success" className="mt-2 text-sm"><CheckCircle size={14} className="inline mr-1" />Completed</Badge>
           )}
        </div>

        <GlassCardContent>
          {/* Video Player */}
          <div className="bg-black rounded-xl overflow-hidden aspect-video shadow-lg mb-6 relative">
            {youtubeId ? (
              <iframe
                id={`yt-player-${lessonId}`}
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&enablejsapi=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : lesson.videoUrl ? (
              <>
                <video 
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full"
                  controls 
                  crossOrigin="anonymous"
                  controlsList="nodownload"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onSeeking={handleSeeking}
                  onRateChange={handleRateChange}
                  onEnded={handleEnded}
                  onError={() => setLoadError(true)}
                />
                {loadError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white p-6 text-center">
                    <Wrench size={48} className="text-red-500 mb-4" />
                    <h3 className="text-lg font-bold mb-2">Technical Difficulty</h3>
                    <p className="text-slate-400 text-sm max-w-xs">
                      We're having trouble loading this video. Please check your connection or try again.
                    </p>
                    <Button 
                      variant="primary" 
                      className="mt-6" 
                      onClick={() => { setLoadError(false); if(videoRef.current) videoRef.current.load(); }}
                    >
                      Retry Video
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <BookOpen size={48} className="opacity-20 mb-4" />
                <p className="text-sm font-medium">No video content assigned to this lesson</p>
              </div>
            )}
          </div>
          
          
          <div className="mt-8">
            <Tabs
              tabs={[
                {
                  id: 'overview',
                  label: 'Overview',
                  icon: <FileText size={16} />,
                  content: (
                    <div className="space-y-6">
                      <div className="p-5 bg-white/40 rounded-2xl border border-white/60 shadow-sm">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          Description
                        </h4>
                        <p className="text-slate-600 leading-relaxed">{lesson.description || "No description provided."}</p>
                      </div>
                      
                      {lesson.pdfUrl && (
                        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                              <FileText size={24} />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">Skill Materials</h4>
                              <p className="text-sm text-slate-500">
                                {lesson.pdfSize ? `${(Number(lesson.pdfSize) / (1024 * 1024)).toFixed(2)} MB` : "Downloadable PDF"}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="primary" 
                            size="md" 
                            leftIcon={<FileDown size={18} />}
                            onClick={() => {
                              const url = getAssetUrl(lesson.pdfUrl);
                              window.open(url, "_blank");
                            }}
                          >
                            Download PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  id: 'objectives',
                  label: 'Objectives',
                  icon: <Target size={16} />,
                  content: <ContentList title="Lesson Objectives" items={lesson.objectives} icon={<Target className="text-blue-500" size={18} />} />
                },
                {
                  id: 'outcomes',
                  label: 'Outcomes',
                  icon: <Award size={16} />,
                  content: <ContentList title="Learning Outcomes" items={lesson.outcomes} icon={<Award className="text-purple-500" size={18} />} />
                },
                {
                  id: 'materials',
                  label: 'Required Materials',
                  icon: <Wrench size={16} />,
                  content: <ContentList title="Tools & Materials" items={lesson.materials} icon={<Wrench className="text-orange-500" size={18} />} />
                },
                {
                  id: 'theory',
                  label: 'Theory',
                  icon: <BookOpen size={16} />,
                  content: (
                    <div className="p-6 bg-white/40 rounded-2xl border border-white/60 shadow-sm min-h-[300px]">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 underline decoration-blue-500/30 underline-offset-8">
                        Lesson Theory Content
                      </h4>
                      {lesson.theory ? (
                        <div 
                          className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.theory) }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                          <BookOpen size={48} className="mb-2 opacity-20" />
                          <p className="italic text-sm">Detailed theory content is coming soon.</p>
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  id: 'tasks',
                  label: 'Associated Tasks',
                  icon: <ClipboardCheck size={16} />,
                  content: (
                    <div className="space-y-4">
                      {lesson.tasks && lesson.tasks.length > 0 ? (
                        lesson.tasks.map((task: any) => (
                          <div 
                            key={task.id}
                            className="p-4 bg-white/50 rounded-xl border border-white/60 flex justify-between items-start group hover:border-blue-300 transition-colors shadow-sm"
                          >
                            <div className="flex items-start gap-4">
                              <div className="p-2 bg-orange-50 rounded-lg text-orange-600 group-hover:bg-orange-100 transition-colors flex-shrink-0 mt-1">
                                <FileText size={20} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 leading-tight">{task.title}</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                  Day {task.dayNumber} · Max Marks: {task.maxMarks}
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-600"
                              onClick={() => navigate(`/student/skills/${lesson.skillId}/tasks/${task.id}`)}
                            >
                              Go to Task
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center bg-white/30 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                          <p className="italic">No specific tasks linked to this lesson.</p>
                        </div>
                      )}
                    </div>
                  )
                }
              ]}
            />
          </div>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

const ContentList = ({ title, items, icon }: { title: string, items: string[], icon: React.ReactNode }) => (
  <div className="p-6 bg-white/40 rounded-2xl border border-white/60 shadow-sm">
    <h4 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
      {icon} {title}
    </h4>
    {items && items.length > 0 ? (
      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3 text-slate-600">
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            <span className="text-sm leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-slate-400 italic py-4">No {title.toLowerCase()} specified yet.</p>
    )}
  </div>
);

export default VideoPlayerPage;
