import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { facultyService } from "@/services/faculty";
import { GlassCard, Badge, Button } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import {
  Plus,
  Trash2,
  X,
  Settings,
  BookOpen,
  Users,
  Info,
  Clock,
  ShieldCheck,
  PlusCircle,
  Save,
  Layout,
  Activity,
  CheckCircle2,
  FileText,
  FileQuestion,
  ListTodo,
  AlertCircle,
  RefreshCcw,
  Eye
} from "lucide-react";
import toast from "react-hot-toast";
import { Tabs } from "@/components/ui/Tabs";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

const CourseBuilder = () => {
  const { skillId: id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [skill, setSkill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const {
    data: days,
    setData: setDays,
    isDirty,
    isSaving,
    lastSaved,
    hasConflict,
    setHasConflict,
    save: saveToBackend,
    clearDraft
  } = useDraftPersistence({
    key: `skill_builder_${id}`,
    initialData: [] as any[],
    onSave: async (data) => {
      const res = await facultyService.updateFullCurriculum(id!, data);
      if (res.success) {
        setSkill((prev: any) => ({ ...prev, updatedAt: new Date() }));
      }
    }
  });

  const [basicInfo, setBasicInfo] = useState({
    name: "",
    skillCode: "",
    description: "",
    durationWeeks: 4,
    totalDays: 0,
    totalHours: 0,
    overallOutcome: "",
    relevance: "",
    preparedBy: [] as any[],
    externalLinks: [] as any[],
    standardsFollowed: [] as string[],
    skillCoverage: {
      safety: true,
      equipmentHandling: true,
      processTypes: [],
      testingInspection: true,
      repairMaintenance: true,
      fabrication: true
    }
  });

  useEffect(() => {
    if (id) fetchSkill();

    const lastTab = sessionStorage.getItem(`builder_tab_${id}`);
    if (lastTab) setActiveTab(lastTab);
  }, [id]);

  useEffect(() => {
    sessionStorage.setItem(`builder_tab_${id}`, activeTab);
  }, [activeTab, id]);

  const fetchSkill = async () => {
    try {
      setLoading(true);
      const res = await facultyService.getSkillDetails(id as string);
      if (res.success) {
        const s = res.data;
        setSkill(s);
        setBasicInfo({
          name: s.name || "",
          skillCode: s.skillCode || "",
          description: s.description || "",
          durationWeeks: s.durationWeeks || 0,
          totalDays: s.totalDays || 0,
          totalHours: s.totalHours || 0,
          overallOutcome: s.overallOutcome || "",
          relevance: s.relevance || "",
          preparedBy: s.preparedBy || [],
          externalLinks: s.externalLinks || [],
          standardsFollowed: s.standardsFollowed || [],
          skillCoverage: s.skillCoverage || {
            safety: true,
            equipmentHandling: true,
            processTypes: [],
            testingInspection: true,
            repairMaintenance: true,
            fabrication: true
          }
        });

        // Restore from DB if no local draft exists or if we want to sync
        if (!isDirty) {
          setDays(s.chapters || []);
          if (s.chapters?.length > 0 && !selectedDayId) {
            setSelectedDayId(s.chapters[0].id);
          }
        }
      }
    } catch (error: any) {
      console.error("Fetch skill error:", error);
      toast.error(
        error?.response?.data?.error?.message || "Failed to load skill details",
      );
    } finally {
      console.log("Fetch skill finished, setting loading to false");
      setLoading(false);
    }
  };

  // Safety trigger: if we're still loading after 5s or if id is missing, show error
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      if (!id) {
        // Fix for missing id
        setErrorVisible(true);
        setLoading(false);
      } else {
        timer = setTimeout(() => {
          if (loading && !skill) {
            console.warn("Loading timed out, clearing spinner");
            setLoading(false);
            setErrorVisible(true);
          }
        }, 5000);
      }
    }
    return () => clearTimeout(timer);
  }, [loading, id, skill]);

  const handleSaveSkill = async () => {
    try {
      const toastId = toast.loading("Saving everything...");

      // 1. Save Basic Info
      const resBasic = await facultyService.updateSkill(id as string, basicInfo);

      // 2. Save Curriculum (using the hook's save which hits the new bulk endpoint)
      const successCurriculum = await saveToBackend();

      if (resBasic.success && successCurriculum) {
        toast.success("Skill updated successfully!", { id: toastId });
        fetchSkill();
      } else {
        toast.error("Some updates failed to save", { id: toastId });
      }
    } catch (e) {
      toast.error("Failed to save skill information");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      <p className="text-slate-400 text-sm animate-pulse">Establishing secure connection to builder...</p>
    </div>
  );

  if (errorVisible || !skill) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center space-y-4">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
        <AlertCircle size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Connection Failed</h2>
      <p className="text-slate-500 max-w-md">
        We couldn't load the course details. This might be due to a missing ID or a temporary network issue.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
          <RefreshCcw size={16} /> Retry
        </Button>
        <Button onClick={() => navigate("/admin/skills")}>Back to Skills</Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-20">
      {/* CONFLICT MODAL */}
      {hasConflict && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full p-8 space-y-6 border-red-200">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle size={32} />
              <h2 className="text-xl font-bold">Version Conflict</h2>
            </div>
            <p className="text-slate-600">
              The course has been updated on the server by someone else. How would you like to proceed?
            </p>
            <div className="grid grid-cols-1 gap-3">
              <Button variant="outline" onClick={() => setHasConflict(false)}>Keep My Changes (Overwrite)</Button>
              <Button variant="secondary" onClick={() => { setHasConflict(false); fetchSkill(); clearDraft(); }}>Discard My Changes (Reload from Server)</Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="purple" className="font-mono">{skill.skillCode}</Badge>
            <Badge variant={skill.status === "approved" ? "success" : "warning"}>
              {skill.status.toUpperCase()}
            </Badge>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Course Builder
          </h1>
          <p className="text-slate-500 font-medium">Editing: {skill.name}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            {isSaving ? (
              <span className="text-xs text-purple-600 font-medium flex items-center gap-2">
                <RefreshCcw size={14} className="animate-spin" /> Saving...
              </span>
            ) : lastSaved ? (
              <span className="text-xs text-slate-400 font-medium italic flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" /> Auto-saved: {lastSaved.toLocaleTimeString()}
              </span>
            ) : isDirty && (
              <span className="text-xs text-orange-500 font-medium italic">Unsaved changes...</span>
            )}
            <Button variant="primary" onClick={handleSaveSkill} className="gap-2 shadow-lg shadow-purple-200">
              <Save size={18} /> Save All
            </Button>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/${user?.role}/skills/${id}/workspace`)}
              className="gap-2 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
            >
              <Layout size={16} /> Open Block Editor
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/faculty/skills/${id}/preview`)} className="text-slate-400">
              <Eye size={16} className="mr-1" /> Preview Course
            </Button>
          </div>
        </div>
      </div>

      {/* TOP TABS */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: "basic",
            label: "Basic Info",
            icon: <Info size={18} />,
            content: <BasicInfoTab info={basicInfo} setInfo={setBasicInfo} />
          },
          {
            id: "curriculum",
            label: "Days / Curriculum",
            icon: <BookOpen size={18} />,
            content: (
              <CurriculumTab
                days={days}
                setDays={setDays}
                selectedDayId={selectedDayId}
                setSelectedDayId={setSelectedDayId}
                id={id as string}
                refresh={fetchSkill}
              />
            )
          },
          {
            id: "faculty",
            label: "Faculty & Access",
            icon: <Users size={18} />,
            content: <FacultyTab />
          },
          {
            id: "settings",
            label: "Settings",
            icon: <Settings size={18} />,
            content: <SettingsTab />
          },
          {
            id: "workspace",
            label: "Block Workspace",
            icon: <Layout size={18} />,
            content: (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-8 animate-in zoom-in-95 duration-700">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
                  <div className="w-24 h-24 bg-white/40 backdrop-blur-xl border border-white/60 text-purple-600 rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10">
                    <Layout size={48} />
                  </div>
                </div>
                <div className="space-y-3">
                  <Badge variant="purple" className="px-4 py-1 text-[10px] tracking-widest uppercase">Standard Active</Badge>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Advanced Workspace Active</h2>
                  <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
                    This course is running on the high-integrity block architecture. 
                    Curriculum delivery and asset management happen in the dedicated workspace.
                  </p>
                </div>
                <Button
                  size="lg"
                  variant="primary"
                  onClick={() => navigate(`/${user?.role}/skills/${id}/workspace`)}
                  className="gap-3 px-10 h-14 rounded-2xl shadow-xl shadow-purple-500/30 font-bold tracking-tight bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all"
                >
                  <Layout size={20} /> Open Block Workspace
                </Button>
              </div>
            )
          }
        ]}
      />
    </div>
  );
};

// ============================================
// TAB COMPONENTS
// ============================================

const BasicInfoTab = ({ info, setInfo }: any) => {
  const updateField = (field: string, value: any) => {
    setInfo((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-6">
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-4">
            <Info className="text-purple-500" /> Core Details
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1.5">Skill Name</label>
                <input
                  type="text"
                  value={info.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1.5">Skill Code</label>
                <input
                  type="text"
                  value={info.skillCode}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1.5">Description</label>
              <textarea
                rows={4}
                value={info.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1.5 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" /> Total Duration (Days)
                </label>
                <input
                  type="number"
                  value={info.totalDays}
                  onChange={(e) => updateField('totalDays', parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1.5 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" /> Total Hours
                </label>
                <input
                  type="number"
                  value={info.totalHours}
                  onChange={(e) => updateField('totalHours', parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b pb-4">
            <CheckCircle2 className="text-green-500" /> Expected Outcomes & Relevance
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1.5 uppercase tracking-wide text-[11px]">Overall Course Outcome</label>
              <RichTextEditor content={info.overallOutcome} onChange={(val) => updateField('overallOutcome', val)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1.5 uppercase tracking-wide text-[11px]">Relevance & Significance</label>
              <RichTextEditor content={info.relevance} onChange={(val) => updateField('relevance', val)} />
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="space-y-6">
        <GlassCard className="p-6">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ShieldCheck className="text-blue-500" /> Skill Coverage
          </h3>
          <div className="space-y-3">
            {[
              { id: 'safety', label: 'Safety Measures' },
              { id: 'equipmentHandling', label: 'Equipment Handling' },
              { id: 'testingInspection', label: 'Testing & Inspection' },
              { id: 'repairMaintenance', label: 'Repair & Maintenance' },
              { id: 'fabrication', label: 'Fabrication / Implementation' },
            ].map(item => (
              <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={(info.skillCoverage as any)[item.id]}
                  onChange={(e) => {
                    const coverage = { ...info.skillCoverage, [item.id]: e.target.checked };
                    updateField('skillCoverage', coverage);
                  }}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
              </label>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-indigo-50 to-white">
          <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PlusCircle className="text-indigo-500" /> Prepared By
          </h3>
          <PreparedByList list={info.preparedBy} setList={(val: any) => updateField('preparedBy', val)} />
        </GlassCard>
      </div>
    </div>
  );
};

const CurriculumTab = ({ days, setDays, selectedDayId, setSelectedDayId }: any) => {
  const selectedDay = days.find((d: any) => d.id === selectedDayId);

  const addDay = () => {
    const nextOrder = days.length + 1;
    const newDay = {
      id: `new-day-${Date.now()}`,
      title: `Day ${nextOrder}`,
      orderIndex: nextOrder,
      dayNumber: nextOrder,
      content: {
        objective: [],
        outcome: [],
        prerequisites: [],
        schedule: [],
        theory: { introduction: "", definitions: [], concepts: [], explanation: "", workingPrinciple: "", notes: "" },
        materials: { tools: [], equipment: [], consumables: [] },
        safety: { precautions: [], hazards: { electrical: [], fire: [], radiation: [], mechanical: [], chemical: [] }, doList: [], dontList: [] },
      },
      lessons: [],
      tasks: [],
      status: 'draft'
    };
    setDays([...days, newDay]);
    setSelectedDayId(newDay.id);
  };

  const updateDay = (dayId: string, updates: any) => {
    setDays(days.map((d: any) => d.id === dayId ? { ...d, ...updates } : d));
  };

  const deleteDay = (e: React.MouseEvent, dayId: string, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${title}"? This will remove all its content permanently.`)) {
      const updatedDays = days.filter((d: any) => d.id !== dayId);
      // Re-index days
      const reindexed = updatedDays.sort((a: any, b: any) => a.orderIndex - b.orderIndex).map((d: any, i: number) => ({
        ...d,
        orderIndex: i + 1,
        dayNumber: i + 1
      }));
      setDays(reindexed);
      if (selectedDayId === dayId) {
        setSelectedDayId(reindexed[0]?.id || null);
      }
      toast.success("Day scheduled for removal");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px] animate-in slide-in-from-right-4 duration-500">
      {/* LEFT SIDEBAR: DAY LIST */}
      <div className="lg:col-span-1 space-y-4">
        <GlassCard className="p-4 bg-slate-50/50 h-full">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Timeline</h4>
            <Button size="sm" variant="primary" onClick={addDay}><Plus size={14} /></Button>
          </div>
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            {days.sort((a: any, b: any) => a.orderIndex - b.orderIndex).map((day: any) => (
              <div
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all border-2 ${selectedDayId === day.id
                    ? 'bg-white border-purple-500 shadow-md transform scale-[1.02]'
                    : 'bg-white/50 border-transparent hover:border-slate-200'
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Day {day.orderIndex}</span>
                      {day.status === 'approved' && <CheckCircle2 size={12} className="text-green-500" />}
                    </div>
                    <h5 className={`font-bold transition-colors ${selectedDayId === day.id ? 'text-purple-600' : 'text-slate-700'}`}>
                      {day.title}
                    </h5>
                  </div>
                  <button
                    onClick={(e) => deleteDay(e, day.id, day.title)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {days.length === 0 && <p className="text-center py-10 text-xs text-slate-400 italic">No days added yet.</p>}
          </div>
        </GlassCard>
      </div>

      {/* MAIN AREA: DAY EDITOR */}
      <div className="lg:col-span-3">
        {selectedDay ? (
          <DayEditor day={selectedDay} setDay={(updates: any) => updateDay(selectedDay.id, updates)} />
        ) : (
          <GlassCard className="h-full flex flex-col items-center justify-center p-20 text-center grayscale opacity-50">
            <Layout size={48} className="mb-4 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-400">No Day Selected</h3>
            <p className="text-slate-400 text-sm max-w-xs">Select a day from the timeline on the left to start building its content.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

const DayEditor = ({ day, setDay }: any) => {
  const [activeSubTab, setActiveSubTab] = useState("overview");

  const updateContent = (updates: any) => {
    setDay({ content: { ...day.content, ...updates } });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <GlassCard className="p-4 bg-white/80 border-purple-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-lg">
            {day.orderIndex}
          </div>
          <div>
            <input
              type="text"
              value={day.title}
              onChange={(e) => setDay({ title: e.target.value })}
              className="text-xl font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 w-full outline-none"
            />
            <p className="text-xs text-slate-500">Auto-saving enabled</p>
          </div>
        </div>
      </GlassCard>

      <Tabs
        activeTab={activeSubTab}
        onChange={setActiveSubTab}
        variant="pills"
        tabs={[
          {
            id: "overview", label: "Overview", icon: <Info size={14} />, content: (
              <DayOverviewEditor
                content={day.content || {}}
                onChange={updateContent}
              />
            )
          },
          {
            id: "technical", label: "Technical", icon: <Activity size={14} />, content: (
              <TechnicalKnowledgeEditor
                data={day.technicalKnowledge || {}}
                onChange={(val: any) => setDay({ technicalKnowledge: val })}
              />
            )
          },
          {
            id: "testing", label: "Testing", icon: <ShieldCheck size={14} />, content: (
              <TestingMeasurementEditor
                data={day.testingMeasurements || []}
                onChange={(val: any) => setDay({ testingMeasurements: val })}
              />
            )
          },
          {
            id: "maintenance", label: "Maintenance", icon: <Settings size={14} />, content: (
              <MaintenanceRepairEditor
                data={day.maintenanceRepair || {}}
                onChange={(val: any) => setDay({ maintenanceRepair: val })}
              />
            )
          },
          {
            id: "assessments", label: "Assessments", icon: <CheckCircle2 size={14} />, content: (
              <DayAssessmentsEditor
                dayId={day.id}
                mcqData={day.mcqData || {}}
                checklistConfig={day.checklistConfig || {}}
                tasks={day.tasks || []}
                onUpdateMcq={(val: any) => setDay({ mcqData: val })}
                onUpdateChecklist={(val: any) => setDay({ checklistConfig: val })}
                onUpdateTasks={(val: any) => setDay({ tasks: val })}
              />
            )
          }
        ]}
      />
    </div>
  );
};

const DayOverviewEditor = ({ content, onChange }: any) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-purple-500" /> Objectives & Outcomes
          </h4>
          <div className="space-y-4">
            <ListEditor
              title="Daily Objectives"
              items={content.objective || []}
              setItems={(val: any) => onChange({ objective: val })}
            />
            <ListEditor
              title="Daily Outcomes"
              items={content.outcome || []}
              setItems={(val: any) => onChange({ outcome: val })}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" /> Daily Schedule
          </h4>
          <ScheduleEditor
            items={content.schedule || []}
            setItems={(val: any) => onChange({ schedule: val })}
          />
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <FileText size={16} className="text-green-500" /> Theory & Materials
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Introduction</label>
              <RichTextEditor
                content={content.theory?.introduction || ""}
                onChange={(val) => onChange({ theory: { ...content.theory, introduction: val } })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Detailed Explanation</label>
              <RichTextEditor
                content={content.theory?.explanation || ""}
                onChange={(val) => onChange({ theory: { ...content.theory, explanation: val } })}
              />
            </div>
          </div>
          <div className="space-y-4">
            <ListEditor
              title="Tools Required"
              items={content.materials?.tools || []}
              setItems={(val: any) => onChange({ materials: { ...content.materials, tools: val } })}
            />
            <ListEditor
              title="Equipment"
              items={content.materials?.equipment || []}
              setItems={(val: any) => onChange({ materials: { ...content.materials, equipment: val } })}
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

const TechnicalKnowledgeEditor = ({ data, onChange }: any) => {
  const updateField = (field: string, val: any) => onChange({ ...data, [field]: val });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <GlassCard className="p-6">
        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Activity size={16} className="text-indigo-500" /> Theoretical Knowledge
        </h4>
        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-500">Introduction to the Topic</label>
          <RichTextEditor content={data.introduction || ""} onChange={(val) => updateField('introduction', val)} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListEditor title="Key Definitions" items={data.definitions || []} setItems={(val: any) => updateField('definitions', val)} />
            <ListEditor title="Core Concepts" items={data.concepts || []} setItems={(val: any) => updateField('concepts', val)} />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Layout size={16} className="text-blue-500" /> Classifications & Techniques
        </h4>
        <div className="space-y-6">
          <ListEditor title="Classifications / Types" items={data.classifications || []} setItems={(val: any) => updateField('classifications', val)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListEditor title="Operational Parameters" items={data.parameters || []} setItems={(val: any) => updateField('parameters', val)} />
            <ListEditor title="Practical Techniques" items={data.techniques || []} setItems={(val: any) => updateField('techniques', val)} />
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

const TestingMeasurementEditor = ({ data = [], onChange }: any) => {
  const addItem = () => onChange([...data, { step: "", toolUsed: "", valueRange: "", method: "" }]);
  const removeItem = (idx: number) => onChange(data.filter((_: any, i: number) => i !== idx));
  const updateItem = (idx: number, field: string, val: string) => {
    const updated = [...data];
    updated[idx][field] = val;
    onChange(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <ShieldCheck size={16} className="text-green-500" /> Testing & Measurement Steps
          </h4>
          <Button size="sm" variant="outline" onClick={addItem}>+ Add Measurement</Button>
        </div>
        <div className="space-y-3">
          {data.map((item: any, idx: number) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl relative group">
              <button onClick={() => removeItem(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} />
              </button>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Step / Part</label>
                <input type="text" value={item.step} onChange={(e) => updateItem(idx, 'step', e.target.value)} className="w-full text-xs font-bold border-none bg-transparent p-0 focus:ring-0 outline-none" placeholder="e.g. Length measurement" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Tool Used</label>
                <input type="text" value={item.toolUsed} onChange={(e) => updateItem(idx, 'toolUsed', e.target.value)} className="w-full text-xs border-none bg-transparent p-0 focus:ring-0 outline-none" placeholder="e.g. Vernier Caliper" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Range / Tolerance</label>
                <input type="text" value={item.valueRange} onChange={(e) => updateItem(idx, 'valueRange', e.target.value)} className="w-full text-xs border-none bg-transparent p-0 focus:ring-0 outline-none" placeholder="e.g. 10mm +/- 0.1" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase">Method</label>
                <input type="text" value={item.method} onChange={(e) => updateItem(idx, 'method', e.target.value)} className="w-full text-xs border-none bg-transparent p-0 focus:ring-0 outline-none" placeholder="e.g. Parallel contact" />
              </div>
            </div>
          ))}
          {data.length === 0 && <p className="text-center py-10 text-xs text-slate-400 italic">No measurement steps defined yet.</p>}
        </div>
      </GlassCard>
    </div>
  );
};

const MaintenanceRepairEditor = ({ data, onChange }: any) => {
  const updateField = (field: string, val: any) => onChange({ ...data, [field]: val });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <GlassCard className="p-6">
        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Settings size={16} className="text-orange-500" /> Maintenance Strategy
        </h4>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListEditor title="Common Issues" items={data.commonIssues || []} setItems={(val: any) => updateField('commonIssues', val)} />
            <ListEditor title="Preventive Actions" items={data.preventiveMaintenance || []} setItems={(val: any) => updateField('preventiveMaintenance', val)} />
          </div>
          <ListEditor title="Troubleshooting Steps" items={data.troubleshootingSteps || []} setItems={(val: any) => updateField('troubleshootingSteps', val)} />
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">Detailed Repair Procedures</label>
            <RichTextEditor content={data.introduction || ""} onChange={(val) => updateField('introduction', val)} />
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

const DayAssessmentsEditor = ({ mcqData, checklistConfig, tasks, onUpdateMcq, onUpdateChecklist, onUpdateTasks }: any) => {
  const [activeType, setActiveType] = useState("mcq");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex gap-2">
        <button onClick={() => setActiveType('mcq')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeType === 'mcq' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>MCQs</button>
        <button onClick={() => setActiveType('checklist')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeType === 'checklist' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>Checklist</button>
        <button onClick={() => setActiveType('tasks')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeType === 'tasks' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}>Practical Tasks</button>
      </div>

      {activeType === 'mcq' && <MCQEditor data={mcqData} onChange={onUpdateMcq} />}
      {activeType === 'checklist' && <ChecklistEditor data={checklistConfig} onChange={onUpdateChecklist} />}
      {activeType === 'tasks' && <TaskEditor tasks={tasks} onChange={onUpdateTasks} />}
    </div>
  );
};

const MCQEditor = ({ data, onChange }: any) => {
  const questions = data?.questions || [];

  const addQuestion = () => onChange({ ...data, questions: [...questions, { question: "", options: ["", "", "", ""], correctAnswerIndex: 0 }] });
  const updateQuestion = (idx: number, field: string, val: any) => {
    const updated = [...questions];
    updated[idx][field] = val;
    onChange({ ...data, questions: updated });
  };

  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><FileQuestion size={16} className="text-purple-500" /> Multiple Choice Questions</h4>
        <Button size="sm" variant="outline" onClick={addQuestion}>+ Add Question</Button>
      </div>
      <div className="space-y-6">
        {questions.map((q: any, idx: number) => (
          <div key={idx} className="p-4 bg-slate-50 rounded-xl space-y-3 relative group">
            <button onClick={() => onChange({ ...data, questions: questions.filter((_: any, i: number) => i !== idx) })} className="absolute top-2 right-2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>
            <input
              type="text"
              placeholder="Question text..."
              value={q.question}
              onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
              className="w-full p-2 bg-transparent border-b border-slate-200 font-bold text-sm outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              {q.options.map((opt: string, oIdx: number) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q-${idx}`}
                    checked={q.correctAnswerIndex === oIdx}
                    onChange={() => updateQuestion(idx, 'correctAnswerIndex', oIdx)}
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const opts = [...q.options];
                      opts[oIdx] = e.target.value;
                      updateQuestion(idx, 'options', opts);
                    }}
                    placeholder={`Option ${oIdx + 1}`}
                    className="flex-1 text-xs p-1.5 rounded border border-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

const ChecklistEditor = ({ data, onChange }: any) => {
  const items = data?.items || [];

  const addItem = () => onChange({ ...data, items: [...items, { criterion: "", weight: 1, type: "pass_fail" }] });
  const updateItem = (idx: number, field: string, val: any) => {
    const updated = [...items];
    updated[idx][field] = val;
    onChange({ ...data, items: updated });
  };

  return (
    <GlassCard className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><ListTodo size={16} className="text-green-500" /> Observation Checklist</h4>
        <Button size="sm" variant="outline" onClick={addItem}>+ Add Criteria</Button>
      </div>
      <div className="space-y-3">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="flex gap-3 items-center p-3 bg-slate-50 rounded-xl">
            <input
              type="text"
              value={item.criterion}
              onChange={(e) => updateItem(idx, 'criterion', e.target.value)}
              placeholder="Criterion (e.g. Safety Gear worn correctly)"
              className="flex-1 text-xs bg-transparent border-none p-0"
            />
            <select
              value={item.type}
              onChange={(e) => updateItem(idx, 'type', e.target.value)}
              className="text-[10px] p-1 rounded bg-white border border-slate-200"
            >
              <option value="pass_fail">Pass/Fail</option>
              <option value="marks">Marks</option>
            </select>
            <button onClick={() => onChange({ ...data, items: items.filter((_: any, i: number) => i !== idx) })} className="text-red-300"><X size={14} /></button>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

const TaskEditor = ({ tasks, onChange }: any) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", maxMarks: 10, submissionType: "both" });

  const addTask = () => {
    if (!formData.title) return;
    const newTask = {
      id: `new-task-${Date.now()}`,
      ...formData,
      status: 'approved',
      rubric: [{ criterion: "Execution", maxMarks: formData.maxMarks }]
    };
    onChange([...tasks, newTask]);
    setFormData({ title: "", description: "", maxMarks: 10, submissionType: "both" });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {showForm ? (
        <GlassCard className="p-6 border-blue-100 bg-blue-50/20">
          <h5 className="font-bold mb-4">New Practical Task</h5>
          <div className="space-y-4">
            <input type="text" placeholder="Task Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full p-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" />
            <textarea placeholder="Description..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full p-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none" rows={3} />
            <div className="flex gap-2">
              <Button variant="primary" onClick={addTask}>Add to Draft</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </GlassCard>
      ) : (
        <Button variant="outline" className="w-full border-dashed border-2 py-6 hover:bg-slate-50" onClick={() => setShowForm(true)}><Plus size={18} className="mr-2" /> Add Practical Task</Button>
      )}

      <div className="space-y-3">
        {tasks.map((task: any, idx: number) => (
          <div key={task.id || idx} className="p-4 bg-white border border-slate-100 rounded-xl flex justify-between items-center shadow-sm group">
            <div>
              <p className="font-bold text-slate-800">{task.title}</p>
              <p className="text-[10px] text-slate-500">Max Marks: {task.maxMarks} • {task.submissionType.toUpperCase()}</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete the task "${task.title}"?`)) {
                  onChange(tasks.filter((_: any, i: number) => i !== idx));
                  toast.success("Task removed");
                }
              }}
              className="text-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// HELPERS & SHARED
// ============================================

const ListEditor = ({ title, items = [], setItems }: any) => {
  const addItem = () => setItems([...items, ""]);
  const removeItem = (idx: number) => setItems(items.filter((_: any, i: number) => i !== idx));
  const updateItem = (idx: number, val: string) => {
    const updated = [...items];
    updated[idx] = val;
    setItems(updated);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</label>
        <button onClick={addItem} className="text-purple-600 hover:text-purple-700 font-bold text-[10px] uppercase">+ Add</button>
      </div>
      <div className="space-y-2">
        {(items || []).map((item: string, idx: number) => (
          <div key={idx} className="flex gap-2 group">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
              className="flex-1 text-sm p-2 rounded-lg border border-slate-200 focus:border-purple-300 outline-none"
              placeholder="Enter text..."
            />
            <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ScheduleEditor = ({ items = [], setItems }: any) => {
  const addItem = () => setItems([...items, { timeStart: "09:00", timeEnd: "10:00", sessionType: "Theory", topic: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_: any, i: number) => i !== idx));
  const updateItem = (idx: number, field: string, val: string) => {
    const updated = [...items];
    updated[idx][field] = val;
    setItems(updated);
  };

  return (
    <div className="space-y-3">
      {(items || []).map((item: any, idx: number) => (
        <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl flex gap-3 items-center group shadow-sm">
          <div className="grid grid-cols-2 gap-1 w-24">
            <input type="text" value={item.timeStart} onChange={(e) => updateItem(idx, 'timeStart', e.target.value)} className="text-[10px] p-1 border-none bg-slate-50 rounded" />
            <input type="text" value={item.timeEnd} onChange={(e) => updateItem(idx, 'timeEnd', e.target.value)} className="text-[10px] p-1 border-none bg-slate-50 rounded" />
          </div>
          <select
            value={item.sessionType}
            onChange={(e) => updateItem(idx, 'sessionType', e.target.value)}
            className="text-xs p-1 border-none bg-purple-50 text-purple-700 font-bold rounded outline-none"
          >
            <option>Theory</option>
            <option>Hands-on</option>
            <option>Practical</option>
            <option>Viva</option>
            <option>Break</option>
          </select>
          <input
            type="text"
            placeholder="Topic"
            value={item.topic}
            onChange={(e) => updateItem(idx, 'topic', e.target.value)}
            className="flex-1 text-xs font-medium border-none p-0 focus:ring-0 outline-none"
          />
          <button onClick={() => removeItem(idx)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400"><X size={14} /></button>
        </div>
      ))}
      <button onClick={addItem} className="w-full py-2 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-xs font-bold hover:bg-slate-50 hover:text-blue-500 transition-all">
        + Add Session
      </button>
    </div>
  );
};

const PreparedByList = ({ list, setList }: any) => {
  const addItem = () => setList([...list, { name: "", role: "", organization: "" }]);
  const removeItem = (idx: number) => setList(list.filter((_: any, i: number) => i !== idx));
  const updateItem = (idx: number, field: string, val: string) => {
    const updated = [...list];
    updated[idx][field] = val;
    setList(updated);
  };

  return (
    <div className="space-y-3">
      {(list || []).map((item: any, idx: number) => (
        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl relative group shadow-sm">
          <button onClick={() => removeItem(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
            <X size={12} />
          </button>
          <input
            type="text"
            placeholder="Name"
            value={item.name}
            onChange={(e) => updateItem(idx, 'name', e.target.value)}
            className="w-full text-sm font-bold border-none p-0 focus:ring-0 mb-1 outline-none"
          />
          <input
            type="text"
            placeholder="Role (e.g. Subject Expert)"
            value={item.role}
            onChange={(e) => updateItem(idx, 'role', e.target.value)}
            className="w-full text-xs text-slate-500 border-none p-0 focus:ring-0 outline-none"
          />
        </div>
      ))}
      <button onClick={addItem} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:bg-white hover:border-indigo-400 hover:text-indigo-500 transition-all">
        + Add Preparer
      </button>
    </div>
  );
};

// Placeholders for remaining tabs
const FacultyTab = () => <div className="p-20 text-center text-slate-400">Faculty Management Under Development</div>;
const SettingsTab = () => <div className="p-20 text-center text-slate-400">Settings Under Development</div>;

export default CourseBuilder;
