import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { studentService } from "@/services/student";
import { GlassCard, Badge, Button } from "@/components/ui";
import { 
  ArrowLeft, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  BookOpen,
  Lock,
  Zap,
  Layout
} from "lucide-react";
import { BlockRenderer } from "@/components/editor/blocks/BlockRenderer";
import toast from "react-hot-toast";
import { now } from "@/services/time";

const StudentTestCourseView = () => {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [skill, setSkill] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(searchParams.get('day'));
  const [loading, setLoading] = useState(true);
  const [completedBlocks, setCompletedBlocks] = useState<Record<string, string[]>>({});
  const [blockProgressMap, setBlockProgressMap] = useState<Record<string, any>>({});
  const [isSwitchingDay, setIsSwitchingDay] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  
  // Infrastructure Refs
  const tabId = useMemo(() => crypto.randomUUID(), []);
  const hasReplacedRef = useRef(false);
  const heartbeatIntervalRef = useRef<any>(null);

  // 1. SESSION ARBITRATION (Heartbeat & Lock)
  useEffect(() => {
    if (!skillId) return;

    const runHeartbeat = () => {
      const lockKey = `hlms_active_session_${skillId}`;
      const currentTime = now();
      const currentLock = JSON.parse(localStorage.getItem(lockKey) || '{}');

      // Rule: Newest wins. Ties broken by tabId.
      const incomingWins = 
        !currentLock.tabId || 
        currentTime > (currentLock.lastActive + 5000) || // Lock expired
        currentTime > currentLock.lastActive ||
        (currentTime === currentLock.lastActive && tabId > currentLock.tabId);

      if (incomingWins) {
        localStorage.setItem(lockKey, JSON.stringify({
          tabId,
          lastActive: currentTime,
          skillId
        }));
        setIsReadOnly(false);
      } else {
        if (!isReadOnly) {
            setIsReadOnly(true);
            toast.error("Multi-tab detected: Read-Only Mode active", { id: 'session-lock' });
        }
      }
    };

    runHeartbeat();
    heartbeatIntervalRef.current = setInterval(runHeartbeat, 2500);

    return () => {
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [skillId, tabId, isReadOnly]);

  // 2. DATA HYDRATION (Freshness-Wins Merge)
  const fetchSkill = useCallback(async () => {
    try {
      setLoading(true);
      const res = await studentService.getSkillDetails(skillId as string);
      if (res.success) {
        setSkill(res.data);
        const sortedChapters = (res.data.chapters || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex);
        setChapters(sortedChapters);
        
        // Authority Merge: Backend vs Local Cache
        const localProgressKey = `hlms_local_progress_${skillId}`;
        const localProgress = JSON.parse(localStorage.getItem(localProgressKey) || '{}');
        const backendProgress = res.data.enrollment?.blockProgress || {};
        const backendCompleted = res.data.enrollment?.completedBlocks || {};

        // Merge logic: Newest updatedAt wins
        const mergedProgress = { ...backendProgress };
        Object.keys(localProgress).forEach(blockId => {
          if (!mergedProgress[blockId] || localProgress[blockId].updatedAt > mergedProgress[blockId].updatedAt) {
            mergedProgress[blockId] = localProgress[blockId];
          }
        });

        setBlockProgressMap(mergedProgress);
        setCompletedBlocks(backendCompleted);
        
        // URL Sync & Normalized Selection
        const urlDayId = searchParams.get('day');
        const validDay = sortedChapters.find((c: any) => c.id === urlDayId);

        if (!urlDayId || !validDay) {
          if (sortedChapters.length > 0 && !hasReplacedRef.current) {
            hasReplacedRef.current = true;
            setSelectedChapterId(sortedChapters[0].id);
            setSearchParams({ day: sortedChapters[0].id }, { replace: true });
          }
        } else {
          setSelectedChapterId(urlDayId);
        }
      }
    } catch (err) {
      toast.error("Failed to load course details");
    } finally {
      setLoading(false);
    }
  }, [skillId, searchParams, setSearchParams]);

  useEffect(() => {
    if (skillId) fetchSkill();
  }, [skillId, fetchSkill]);

  // 3. EXIT-SAFE SYNC (Triple-Layer Flush)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
         document.dispatchEvent(new CustomEvent('hlms:flush_progress', { detail: { force: true } }));
      }
    };

    const handleBeforeUnload = () => {
       document.dispatchEvent(new CustomEvent('hlms:flush_progress', { detail: { force: true } }));
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleDayChange = (id: string) => {
    if (isSwitchingDay || id === selectedChapterId) return;
    
    // Flush current day before switching
    document.dispatchEvent(new CustomEvent('hlms:flush_progress', { detail: { force: true } }));
    
    setIsSwitchingDay(true);
    setSelectedChapterId(id);
    setSearchParams({ day: id });
    
    // Deterministic reset after render
    setTimeout(() => setIsSwitchingDay(false), 50);
  };

  const activeChapter = useMemo(() => chapters.find(c => c.id === selectedChapterId), [chapters, selectedChapterId]);
  const currentChapterIdx = useMemo(() => chapters.findIndex(c => c.id === selectedChapterId), [chapters, selectedChapterId]);
  const stableBlocks = useMemo(() => activeChapter?.blocks || [], [activeChapter?.blocks]);
  
  const handleBlockComplete = useCallback(async (blockId: string) => {
    if (!selectedChapterId || isReadOnly) return;
    
    const alreadyCompleted = completedBlocks[selectedChapterId]?.includes(blockId);
    if (alreadyCompleted) return;

    try {
      await studentService.updateBlockProgress(selectedChapterId, blockId);
      setCompletedBlocks(prev => ({
        ...prev,
        [selectedChapterId]: [...(prev[selectedChapterId] || []), blockId]
      }));
      toast.success("Lesson Completed", { icon: '✅' });
    } catch (e) {
      console.error("Completion sync failed");
    }
  }, [selectedChapterId, completedBlocks, isReadOnly]);

  const handleProgressUpdate = useCallback(async (blockId: string, percentage: number, position: number) => {
    if (isReadOnly) return;
    
    // Local persistence for fallback
    const localProgressKey = `hlms_local_progress_${skillId}`;
    const currentLocal = JSON.parse(localStorage.getItem(localProgressKey) || '{}');
    
    localStorage.setItem(localProgressKey, JSON.stringify({
      ...currentLocal,
      [blockId]: {
        seconds: position,
        percentage,
        updatedAt: now()
      }
    }));

    if (percentage >= 100) {
       handleBlockComplete(blockId);
    }
  }, [isReadOnly, skillId, handleBlockComplete]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-400 font-bold uppercase tracking-widest animate-pulse">Establishing Session...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 selection:bg-blue-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 px-8 py-5">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="rounded-2xl hover:bg-slate-100 h-10 w-10 p-0">
               <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none tracking-tight">{skill?.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="px-2 py-0 h-4 text-[8px] font-black uppercase tracking-tighter rounded-sm">STUDENT</Badge>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">High-Integrity Context</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
             {isReadOnly && (
               <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-600 animate-pulse">
                  <Lock size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Read Only</span>
               </div>
             )}
             <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Overall Progress</p>
                <p className="text-sm font-black text-blue-600 leading-none">{Math.floor(skill?.enrollment?.progress || 0)}%</p>
             </div>
             <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                <Zap size={20} fill="currentColor" />
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 px-6 flex flex-col md:flex-row gap-8">
        {/* Navigation Rail (Day Switcher) */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
           <div className="space-y-2">
              <p className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Learning Days</p>
              {chapters.map((chapter, idx) => {
                const isSelected = selectedChapterId === chapter.id;
                const isChapterCompleted = (completedBlocks[chapter.id]?.length || 0) === (chapter.blocks?.length || 0) && chapter.blocks?.length > 0;
                
                return (
                  <button
                    key={chapter.id}
                    onClick={() => handleDayChange(chapter.id)}
                    className={`w-full text-left p-4 rounded-[1.5rem] transition-all duration-300 flex items-center justify-between group ${
                      isSelected 
                        ? 'bg-white shadow-xl shadow-blue-500/10 border border-blue-100 text-blue-600 scale-[1.02]' 
                        : 'text-slate-500 hover:bg-white/60 hover:translate-x-1'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                       <span className={`text-xs font-black ${isSelected ? 'text-blue-500' : 'text-slate-300'}`}>D{idx + 1}</span>
                       <span className="text-sm font-bold truncate max-w-[120px]">{chapter.title || `Day ${idx + 1}`}</span>
                    </div>
                    {isChapterCompleted ? <CheckCircle2 size={16} className="text-green-500" /> : <ChevronRight size={14} className={isSelected ? 'text-blue-400' : 'opacity-20'} />}
                  </button>
                );
              })}
           </div>

           <GlassCard variant="secondary" className="p-6 overflow-hidden relative border-none bg-slate-100/50">
              <div className="absolute -right-4 -bottom-4 opacity-5 text-blue-600">
                 <BookOpen size={80} />
              </div>
              <h4 className="text-sm font-black text-slate-800 mb-2 uppercase tracking-tighter">Session Policy</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Progress is automatically synchronized. Only one active session per account is permitted.</p>
           </GlassCard>
        </div>

        {/* Learning Canvas */}
        <div className="flex-1 min-w-0">
           {activeChapter ? (
             <div className={`space-y-8 transition-all duration-500 ${isSwitchingDay ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                <div className="mb-12">
                   <div className="flex items-center gap-3 mb-4">
                      <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                        Learning Day {currentChapterIdx + 1}
                      </Badge>
                      {isReadOnly && <Badge variant="secondary" className="text-amber-600 border-amber-200">READ ONLY</Badge>}
                   </div>
                   <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">{activeChapter.title}</h2>
                   <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                </div>

                <div className="space-y-12">
                  {stableBlocks.map((block: any) => {
                    const isCompleted = completedBlocks[selectedChapterId!]?.includes(block.id);
                    
                    return (
                      <div 
                        key={block.id}
                        className={`transition-all duration-500 ${isCompleted ? 'opacity-100' : ''}`}
                      >
                         <div className="relative">
                            <BlockRenderer 
                              block={block}
                              isStudent
                              skillId={skillId}
                              chapterId={selectedChapterId!}
                              initialPosition={blockProgressMap[block.id]?.seconds || 0}
                              onProgress={(pct, pos) => handleProgressUpdate(block.id, pct, pos)}
                              onComplete={() => handleBlockComplete(block.id)}
                            />

                            {['text', 'heading', 'divider', 'image', 'list'].includes(block.type) && !isCompleted && (
                              <div className="flex justify-end mt-4">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleBlockComplete(block.id)}
                                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 rounded-xl"
                                  rightIcon={<CheckCircle2 size={12} />}
                                >
                                  Mark as Completed
                                </Button>
                              </div>
                            )}
                         </div>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-16 mt-16 border-t border-slate-200">
                  <Button 
                    variant="ghost" 
                    disabled={currentChapterIdx === 0}
                    onClick={() => handleDayChange(chapters[currentChapterIdx - 1]?.id)}
                    leftIcon={<ChevronLeft size={18} />}
                    className="rounded-3xl font-bold text-sm h-14 px-8 border border-slate-200 hover:bg-white shadow-sm"
                  >
                    Previous Day
                  </Button>
                  
                  <Button 
                    variant="primary"
                    disabled={currentChapterIdx === chapters.length - 1}
                    onClick={() => handleDayChange(chapters[currentChapterIdx + 1]?.id)}
                    rightIcon={<ChevronRight size={18} />}
                    className="rounded-3xl font-bold text-sm h-14 px-10 shadow-xl shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Next Day
                  </Button>
                </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-48 text-slate-300">
                <Layout size={64} strokeWidth={1} className="mb-4 opacity-10 animate-pulse" />
                <p className="text-sm font-black uppercase tracking-widest">Select a Learning Day to begin</p>
                <p className="text-xs font-medium text-slate-400 mt-2">Pick a session from the sidebar</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default StudentTestCourseView;
