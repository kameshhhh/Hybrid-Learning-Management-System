import { useState, useEffect } from "react";
import { facultyService } from "@/services/faculty";
import { GlassCard, Badge, Button } from "@/components/ui";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

const ReviewLogsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  // Review Modal/Inline state
  const [reviewingLogId, setReviewingLogId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await facultyService.getProgressLogs({ status: filter });
      if (res.success) {
        setLogs(res.data);
      }
    } catch (e) {
      toast.error("Failed to load progress logs");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!reviewingLogId) return;
    try {
      const res = await facultyService.reviewProgressLog(reviewingLogId, {
        remarks: feedback,
        isApproved: status === "approved",
      });
      if (res.success) {
        toast.success(
          `Log ${status === "approved" ? "approved" : "rejected"} successfully!`,
        );
        setReviewingLogId(null);
        setFeedback("");
        fetchLogs();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Review failed");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Student Progress Logs
          </h1>
          <p className="text-slate-500 mt-1">
            Review and approve weekly learning logs from your students.
          </p>
        </div>
        <div className="flex bg-white/50 p-1 rounded-xl shadow-sm border border-white/40">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filter === "pending" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setFilter("pending")}
          >
            Pending
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filter === "reviewed" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setFilter("reviewed")}
          >
            Reviewed
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <p className="text-center py-10">Loading logs...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white/30 rounded-3xl border border-dashed border-slate-300">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-slate-500">No logs found for this filter.</p>
          </div>
        ) : (
          logs.map((log) => (
            <GlassCard
              key={log.id}
              variant="secondary"
              className="overflow-hidden"
            >
              <div className="p-4 bg-white/40 flex justify-between items-center border-b border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {log.student?.fullName?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {log.student?.fullName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {log.skill?.name} • Week {log.weekNumber}
                    </p>
                  </div>
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
                      ? "Rejected"
                      : "Pending Review"}
                </Badge>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Work Done
                  </h4>
                  <p className="text-slate-700">{log.workDone}</p>
                </div>
                {log.challengesFaced && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Challenges
                    </h4>
                    <p className="text-slate-600 italic">
                      "{log.challengesFaced}"
                    </p>
                  </div>
                )}

                {reviewingLogId === log.id ? (
                  <div className="mt-4 pt-4 border-t border-white/40 space-y-3">
                    <textarea
                      className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none resize-none text-sm"
                      placeholder="Provide feedback for the student..."
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReviewingLogId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleReview("rejected")}
                        leftIcon={<XCircle size={14} />}
                      >
                        Request Changes
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleReview("approved")}
                        leftIcon={<CheckCircle size={14} />}
                      >
                        Approve Log
                      </Button>
                    </div>
                  </div>
                ) : filter === "pending" ? (
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setReviewingLogId(log.id)}
                    >
                      Review Now
                    </Button>
                  </div>
                ) : (
                  log.facultyFeedback && (
                    <div className="mt-2 p-3 bg-white/50 rounded-xl border border-white/60">
                      <p className="text-xs text-slate-500 font-bold uppercase mb-1">
                        Your Feedback
                      </p>
                      <p className="text-sm text-slate-700">
                        {log.facultyFeedback}
                      </p>
                    </div>
                  )
                )}
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewLogsPage;
