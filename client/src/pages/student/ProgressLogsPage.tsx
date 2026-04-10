import { useState, useEffect } from "react";
import { studentService } from "@/services/student";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  Badge,
  Button,
} from "@/components/ui";
import { Plus, Clock } from "lucide-react";
import toast from "react-hot-toast";

const ProgressLogsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    skillId: "",
    workDone: "",
    challengesFaced: "",
    nextPlan: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, skillsRes] = await Promise.all([
        studentService.getProgressLogs(),
        studentService.getMySkills(),
      ]);
      if (logsRes.success) setLogs(logsRes.data);
      if (skillsRes.success) setSkills(skillsRes.data);
    } catch (e) {
      toast.error("Failed to load progress data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.skillId) return toast.error("Please select a skill");
    try {
      const res = await studentService.submitProgressLog(
        formData.skillId,
        formData,
      );
      if (res.success) {
        toast.success("Progress log submitted successfully!");
        setShowForm(false);
        setFormData({
          skillId: "",
          workDone: "",
          challengesFaced: "",
          nextPlan: "",
        });
        fetchData();
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to submit log",
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Weekly Progress Tracker
          </h1>
          <p className="text-slate-500 mt-1">
            Log your learning journey and get feedback from faculty.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Submit Log"}
        </Button>
      </div>

      {showForm && (
        <GlassCard variant="secondary" padding="lg">
          <GlassCardHeader title="New Weekly Log" />
          <GlassCardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Skill
                </label>
                <select
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  value={formData.skillId}
                  onChange={(e) =>
                    setFormData({ ...formData, skillId: e.target.value })
                  }
                >
                  <option value="">-- Choose a skill --</option>
                  {skills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Work Done This Week
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  value={formData.workDone}
                  onChange={(e) =>
                    setFormData({ ...formData, workDone: e.target.value })
                  }
                  placeholder="What chapters/tasks did you complete?"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Challenges Faced
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    value={formData.challengesFaced}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        challengesFaced: e.target.value,
                      })
                    }
                    placeholder="Any blockers or difficulties?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Next Week Plan
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    value={formData.nextPlan}
                    onChange={(e) =>
                      setFormData({ ...formData, nextPlan: e.target.value })
                    }
                    placeholder="Goals for the next week?"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="primary">
                  Submit Progress
                </Button>
              </div>
            </form>
          </GlassCardContent>
        </GlassCard>
      )}

      <div className="space-y-4">
        {loading ? (
          <p>Loading logs...</p>
        ) : logs.length === 0 ? (
          <GlassCard variant="card" padding="lg">
            <div className="text-center text-slate-500">
              <Clock size={48} className="mx-auto mb-3 opacity-20" />
              No progress logs submitted yet.
            </div>
          </GlassCard>
        ) : (
          logs.map((log) => (
            <GlassCard
              key={log.id}
              variant="secondary"
              className="overflow-hidden"
            >
              <div className="p-4 bg-white/40 flex justify-between items-center border-b border-white/20">
                <div className="flex items-center gap-3">
                  <Badge variant="purple">Week {log.weekNumber || 1}</Badge>
                  <h3 className="font-semibold text-slate-800">
                    {log.skill?.name}
                  </h3>
                </div>
                <Badge
                  variant={
                    log.isApproved
                      ? "success"
                      : log.reviewedAt
                        ? "error"
                        : "warning"
                  }
                >
                  {log.isApproved
                    ? "Approved"
                    : log.reviewedAt
                      ? "Needs Changes"
                      : "Pending Review"}
                </Badge>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm">
                  <span className="font-bold text-slate-700">Work Done:</span>{" "}
                  {log.workDone}
                </p>
                {log.facultyFeedback && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 mt-2">
                    <p className="text-sm text-purple-800">
                      <span className="font-bold">Faculty Feedback:</span>{" "}
                      {log.facultyFeedback}
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};

export default ProgressLogsPage;
