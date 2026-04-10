import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { facultyService } from "@/services/faculty";
import { Badge, Button } from "@/components/ui";
import { 
  Plus, 
  Save, 
  ArrowLeft, 
  Layout, 
  Settings,
  ChevronRight,
  Eye,
  Trash2,
  Calendar
} from "lucide-react";
import { BlockEditor } from "@/components/editor/BlockEditor";
import toast from "react-hot-toast";

const TestCourseBuilder = () => {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (skillId) fetchSkill();
  }, [skillId]);

  const fetchSkill = async () => {
    try {
      setLoading(true);
      const res = await facultyService.getSkillDetails(skillId as string);
      if (res.success) {
        setSkill(res.data);
        const sortedChapters = (res.data.chapters || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex);
        setChapters(sortedChapters);
        if (sortedChapters.length > 0 && !selectedChapterId) {
          setSelectedChapterId(sortedChapters[0].id);
        }
      }
    } catch (error) {
      toast.error("Failed to load skill details");
    } finally {
      setLoading(false);
    }
  };

  const activeChapter = chapters.find(c => c.id === selectedChapterId);

  const handleBlocksChange = (newBlocks: any[]) => {
    setChapters(prev => prev.map(c => c.id === selectedChapterId ? { ...c, blocks: newBlocks } : c));
  };

  const handleSave = async () => {
    if (!selectedChapterId || !activeChapter) return;
    try {
      setSaving(true);
      await facultyService.updateChapterBlocks(selectedChapterId, activeChapter.blocks || []);
      toast.success("Learning Day precisely saved", {
         style: { borderRadius: '15px', background: '#333', color: '#fff' }
      });
    } catch (error) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addNewChapter = async () => {
    try {
      const res = await facultyService.createChapter(skillId as string, {
        title: `Learning Day ${chapters.length + 1}`,
      });
      if (res.success) {
        setChapters(prev => [...prev, res.data]);
        setSelectedChapterId(res.data.id);
        toast.success("New learning day added");
      }
    } catch (error) {
      toast.error("Failed to add day");
    }
  };

  const handleDeleteChapter = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await facultyService.deleteChapter(id);
      if (res.success) {
        toast.success("Day deleted from curriculum");
        setChapters(prev => {
          const filtered = prev.filter(c => c.id !== id);
          if (selectedChapterId === id) {
            setSelectedChapterId(filtered[0]?.id || null);
          }
          return filtered;
        });
      }
    } catch (error) {
      toast.error("Deletion failed");
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px] text-slate-400 font-black tracking-widest uppercase animate-pulse">Initializing Workspace...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="rounded-xl">
              <ArrowLeft size={18} />
            </Button>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{skill?.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="purple" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0">Curriculum Builder</Badge>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">• HIGH-INTEGRITY MODE</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button 
                variant="ghost" 
                onClick={() => navigate(`/student/skills/${skillId}`)}
                className="text-slate-500 font-bold uppercase text-xs tracking-widest h-10 px-6 rounded-2xl border border-slate-100"
              >
               <Eye size={16} className="mr-2" /> Hub Preview
             </Button>
             <Button 
               variant="primary" 
               className="h-10 px-8 rounded-2xl shadow-lg shadow-blue-500/20 font-bold uppercase text-xs tracking-widest bg-blue-600 hover:bg-blue-700"
               leftIcon={<Save size={16} />}
               onClick={handleSave}
               isLoading={saving}
             >
               Sync Day
             </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto flex gap-6 p-8">
        {/* Left Sidebar - Navigation */}
        <div className="w-80 shrink-0 space-y-4">
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center justify-between mb-4 px-2">
               <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-500" />
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Learning Days</span>
               </div>
            </div>
            {chapters.map((chapter, idx) => (
              <button
                key={chapter.id}
                onClick={() => setSelectedChapterId(chapter.id)}
                className={`w-full text-left p-3 rounded-2xl transition-all duration-200 flex items-center justify-between group ${
                  selectedChapterId === chapter.id 
                    ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                   <span className={`text-[10px] font-black w-5 ${selectedChapterId === chapter.id ? 'text-blue-500' : 'text-slate-300'}`}>D{idx + 1}</span>
                   <span className="text-sm font-bold truncate max-w-[160px]">{chapter.title}</span>
                </div>
                <div className="flex items-center gap-2">
                   <ChevronRight size={14} className={`transition-transform ${selectedChapterId === chapter.id ? 'rotate-90 text-blue-400' : 'opacity-0 group-hover:opacity-100 text-slate-300'}`} />
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       handleDeleteChapter(chapter.id, chapter.title);
                     }}
                     className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
              </button>
            ))}
            <button 
              onClick={addNewChapter}
              className="w-full flex items-center gap-3 p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-2xl mt-4 border border-dashed border-slate-200 transition-all font-bold text-xs uppercase tracking-widest"
            >
              <Plus size={16} /> Add Day
            </button>
          </div>

          <div className="p-6 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-8 opacity-5 text-white">
                <Settings size={64} />
             </div>
             <h4 className="text-white font-bold text-sm mb-1 text-blue-400">Builder Guidelines</h4>
             <p className="text-slate-400 text-xs mb-4 leading-relaxed">Each day supports up to 50 learning blocks. Use 1.25x max speed for video sessions.</p>
             <div className="h-px bg-slate-800 mb-4" />
             <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Integrity</span>
                <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-none px-2 py-0 text-[10px] font-black">ACTIVE</Badge>
             </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm min-h-[calc(100vh-180px)] overflow-hidden relative">
            {activeChapter ? (
              <>
                <div className="px-16 pt-16 pb-12 border-b border-slate-50 bg-slate-50/20">
                  <div className="flex items-center gap-4 mb-4">
                    <Badge variant="purple" className="px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-sm bg-white text-blue-600 border-blue-100">
                      Day {chapters.findIndex(c => c.id === selectedChapterId) + 1} Configuration
                    </Badge>
                    <span className="h-1 w-1 bg-slate-300 rounded-full" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{activeChapter.blocks?.length || 0} Block Components</span>
                  </div>
                  <input 
                    type="text" 
                    value={activeChapter.title}
                    onChange={(e) => setChapters(prev => prev.map(c => c.id === selectedChapterId ? { ...c, title: e.target.value } : c))}
                    className="text-5xl font-black text-slate-900 bg-transparent border-none focus:ring-0 w-full outline-none placeholder:text-slate-100 tracking-tighter"
                    placeholder="Enter Day Title..."
                  />
                </div>
                
                <div className="min-h-[600px] p-4">
                  <BlockEditor 
                    blocks={activeChapter.blocks || []} 
                    onChange={handleBlocksChange}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-48 text-slate-300">
                <Layout size={64} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-widest">Select a day to start crafting</p>
                <div className="mt-6">
                   <Button variant="outline" size="sm" onClick={addNewChapter} className="rounded-xl border-dashed">
                      Initialize First Day
                   </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCourseBuilder;
