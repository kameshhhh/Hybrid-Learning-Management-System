import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { studentService } from "@/services/student";
import {
   Badge,
   Button
} from "@/components/ui";
import { ArrowLeft, Play, CheckCircle2, Layout, BookOpen, Clock, ChevronRight, Lock, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const StudentSkillDetailPage = () => {
   const { skillId } = useParams();
   const navigate = useNavigate();
   const [skill, setSkill] = useState<any>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      fetchSkill();
   }, [skillId]);

   const fetchSkill = async () => {
      try {
         setLoading(true);
         const res = await studentService.getSkillDetails(skillId as string);
         if (res.success) {
            setSkill(res.data);
         }
      } catch (e) {
         toast.error("Failed to load skill details");
         navigate("/student/skills");
      } finally {
         setLoading(false);
      }
   };

   // Derived progress and locking logic
   const { dayProgress, firstIncompleteDayId } = useMemo(() => {
      if (!skill) return { dayProgress: {}, firstIncompleteDayId: null };
      const stats: Record<string, { completed: number; total: number; percentage: number }> = {};
      let firstIncompleteId: string | null = null;
      
      const sorted = [...(skill.chapters || [])].sort((a: any, b: any) => a.orderIndex - b.orderIndex);

      sorted.forEach((day: any, idx: number) => {
         const total = day.blocks?.length || 0;
         const completedCount = (skill.enrollment?.completedBlocks?.[day.id]?.length || 0);
         const percentage = total > 0 ? (completedCount / total) * 100 : 0;
         
         stats[day.id] = {
            total,
            completed: completedCount,
            percentage
         };

         // Identification of first available incomplete day
         const isPrevCompleted = idx === 0 || (stats[sorted[idx-1].id].percentage === 100);
         if (!firstIncompleteId && isPrevCompleted && percentage < 100) {
            firstIncompleteId = day.id;
         }
      });

      return { dayProgress: stats, firstIncompleteDayId: firstIncompleteId || sorted[0]?.id };
   }, [skill]);

   if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-black tracking-widest uppercase animate-pulse">Synchronizing Curriculum...</div>;
   if (!skill) return null;

   const sortedDays = (skill.chapters || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex);

   return (
      <div className="min-h-screen bg-[#F1F5F9] pb-24 relative overflow-hidden">
         {/* Background Orbs for Glass Effect */}
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
         <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-400/10 rounded-full blur-[100px] pointer-events-none" />

         {/* Top Navigation */}
         <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between relative z-10">
            <Button 
               variant="ghost" 
               size="sm" 
               onClick={() => navigate("/student/skills")}
               className="rounded-xl bg-white/40 backdrop-blur-md border border-white/40 hover:bg-white/60 shadow-sm transition-all"
               leftIcon={<ArrowLeft size={18} />}
            >
               Back to Skills
            </Button>
            
            <div className="flex items-center gap-4 bg-white/40 backdrop-blur-md border border-white/40 px-4 py-2 rounded-2xl shadow-sm">
               <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Global Progress</p>
                  <p className="text-sm font-black text-slate-900">{Math.floor(skill.enrollment?.progress || 0)}% Completed</p>
               </div>
               <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <Clock size={20} />
               </div>
            </div>
         </div>

         <div className="max-w-6xl mx-auto px-6 relative z-10">
            {/* Mission Glass Header */}
            <div className="bg-white/40 backdrop-blur-2xl rounded-[3rem] border border-white/60 shadow-2xl shadow-slate-200/50 overflow-hidden mb-12 relative">
               <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-600">
                  <Sparkles size={120} />
               </div>
               
               <div className="p-10 lg:p-14 flex flex-col lg:flex-row gap-12 items-center lg:items-center">
                  {/* Thumbnail Section: Static, no rotation, glassy shadow */}
                  <div className="w-full lg:w-[420px] shrink-0 aspect-video rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-900/10 border-4 border-white relative group">
                     <img 
                        src={skill.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80"} 
                        className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" 
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                  
                  {/* Content Section: Perfectly aligned typography */}
                  <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
                     <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-6">
                        <Badge variant="secondary" className="bg-blue-600 text-white border-none font-black px-4 py-1.5 rounded-xl text-[10px] tracking-widest shadow-xl shadow-blue-500/40">
                           {skill.skillCode}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/60 text-slate-500 font-bold px-4 py-1.5 rounded-xl text-[10px] tracking-widest border border-white/80">
                           {sortedDays.length} MASTERY DAYS
                        </Badge>
                     </div>

                     <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter mb-6 leading-none [text-shadow:0_1px_1px_rgba(255,255,255,1)]">
                        {skill.name}
                     </h1>

                     <p className="text-slate-600 text-lg font-medium max-w-2xl leading-relaxed mb-10">
                        {skill.description}
                     </p>

                     <div className="w-full lg:w-auto">
                        <Button 
                           variant="primary" 
                           className="h-16 px-12 rounded-[1.5rem] font-black italic shadow-2xl shadow-blue-600/30 bg-blue-600 hover:bg-blue-700 text-lg transition-all active:scale-[0.98] group"
                           onClick={() => navigate(`/student/skills/${skillId}/workspace?day=${firstIncompleteDayId}`)}
                           rightIcon={<Play size={22} className="group-hover:translate-x-1 transition-transform" fill="currentColor" />}
                        >
                           CONTINUE MASTERY
                        </Button>
                     </div>
                  </div>
               </div>
            </div>

            {/* Mastery Roadmap */}
            <div className="space-y-8">
               <div className="flex items-center justify-between px-4">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur-md flex items-center justify-center border border-white/60 shadow-sm text-blue-600">
                        <Layout size={22} />
                     </div>
                     Curriculum Roadmap
                  </h2>
                  <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-white/40 backdrop-blur-md rounded-full border border-white/60">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Advanced Workspace Active</span>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sortedDays.map((day : any, idx: number) => {
                     const stats = dayProgress[day.id];
                     const isCompleted = stats?.percentage === 100 && stats.total > 0;
                     const isAvailable = idx === 0 || (dayProgress[sortedDays[idx-1].id]?.percentage === 100);
                     const isLocked = !isAvailable;

                     return (
                        <div 
                           key={day.id}
                           onClick={() => isAvailable && navigate(`/student/skills/${skillId}/workspace?day=${day.id}`)}
                           className={`group relative p-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer overflow-hidden ${
                              isLocked 
                                 ? 'bg-slate-50/30 border-slate-100 opacity-60 grayscale cursor-not-allowed' 
                                 : isCompleted 
                                    ? 'bg-white/60 backdrop-blur-xl border-green-200 shadow-xl shadow-green-500/5 hover:-translate-y-2'
                                    : 'bg-white/60 backdrop-blur-xl border-white/80 shadow-2xl shadow-slate-200/50 hover:border-blue-300 hover:shadow-blue-500/10 hover:-translate-y-2'
                           }`}
                        >
                           {/* Status Badge */}
                           <div className="flex items-center justify-between mb-8">
                              <div className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                                 isLocked ? 'bg-slate-200 text-slate-500' : isCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                                 Day {idx + 1}
                              </div>
                              {isLocked ? (
                                 <Lock size={16} className="text-slate-300" />
                              ) : isCompleted ? (
                                 <CheckCircle2 size={20} className="text-green-500 animate-bounce-short" />
                              ) : (
                                 <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                              )}
                           </div>

                           <h3 className="text-xl font-black text-slate-800 mb-3 leading-tight group-hover:text-blue-600 transition-colors">
                              {day.title || `Learning Day ${idx + 1}`}
                           </h3>
                           
                           <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">
                              <BookOpen size={14} className="text-slate-300" />
                              {day.blocks?.length || 0} Block Components
                           </div>

                           {/* Progress Section */}
                           <div className="space-y-3 mt-auto relative z-10">
                              <div className="flex justify-between items-end">
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery</span>
                                 <span className={`text-xs font-black ${isCompleted ? 'text-green-600' : 'text-slate-900'}`}>{Math.floor(stats?.percentage || 0)}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100/50 rounded-full overflow-hidden border border-white/40">
                                 <div 
                                    className={`h-full transition-all duration-1000 ease-out ${
                                       isCompleted ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                    }`} 
                                    style={{ width: `${stats?.percentage || 0}%` }} 
                                 />
                              </div>
                           </div>

                           {/* Interactive Decoration */}
                           {!isLocked && (
                              <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 text-blue-500/20">
                                 <ChevronRight size={120} strokeWidth={4} />
                              </div>
                           )}
                        </div>
                     );
                  })}

                  {/* Empty State / Coming Soon */}
                  {sortedDays.length === 0 && (
                     <div className="col-span-full py-24 bg-white/20 backdrop-blur-md rounded-[4rem] border-2 border-dashed border-white/60 flex flex-col items-center justify-center text-slate-400 transition-all hover:bg-white/30">
                        <div className="w-20 h-20 rounded-3xl bg-white/40 flex items-center justify-center mb-6 shadow-sm border border-white/60 opacity-40">
                           <Layout size={40} />
                        </div>
                        <p className="font-black uppercase tracking-[0.3em] text-sm">Deployment in progress</p>
                        <p className="text-xs font-bold mt-2 opacity-60">The instructor is finalizing the block curriculum</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
         
         <style>{`
            @keyframes bounce-short {
               0%, 100% { transform: translateY(0); }
               50% { transform: translateY(-3px); }
            }
            .animate-bounce-short {
               animation: bounce-short 1s ease-in-out infinite;
            }
         `}</style>
      </div>
   );
};

export default StudentSkillDetailPage;
