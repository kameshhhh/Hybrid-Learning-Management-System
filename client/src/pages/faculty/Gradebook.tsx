import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { facultyService } from "@/services/faculty";
import { GlassCard, GlassCardContent, Badge, Button } from "@/components/ui";
import { GlassCardHeader } from "@/components/ui";
import { CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const Gradebook = () => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, [statusFilter]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await facultyService.getAssessments({ status: statusFilter });
      if (res.success) {
        setAssessments(res.data?.data || []);
      }
    } catch (error: any) {
      toast.error("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            Gradebook
          </h1>
          <p className="text-slate-500 mt-1">
            Review and grade student task submissions.
          </p>
        </div>
        <div className="flex bg-white/50 p-1 rounded-xl shadow-sm border border-white/40">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === "pending" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setStatusFilter("pending")}
          >
            Pending
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === "evaluated" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setStatusFilter("evaluated")}
          >
            Evaluated
          </button>
        </div>
      </div>

      <GlassCard variant="secondary" padding="lg">
        <GlassCardHeader
          title={
            statusFilter === "pending" ? "Needs Grading" : "Graded Submissions"
          }
        />
        <GlassCardContent>
          {loading ? (
            <p>Loading...</p>
          ) : assessments.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              {statusFilter === "pending" ? (
                <CheckCircle
                  size={48}
                  className="mx-auto text-green-400 mb-3"
                />
              ) : (
                <AlertCircle
                  size={48}
                  className="mx-auto text-amber-400 mb-3"
                />
              )}
              <p>
                {statusFilter === "pending"
                  ? "You are all caught up! No pending submissions."
                  : "No evaluated submissions yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-slate-500 text-sm">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Task</th>
                    <th className="pb-3 font-medium">Skill</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {assessments.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="border-b border-white/10 hover:bg-white/40 transition-colors"
                    >
                      <td className="py-4 font-medium text-slate-700">
                        {assessment.student?.fullName || "Unknown"}
                      </td>
                      <td className="py-4 text-slate-600">
                        {assessment.task?.title}
                      </td>
                      <td className="py-4 text-slate-500">
                        {assessment.skill?.name}
                      </td>
                      <td className="py-4">
                        <Badge
                          variant={
                            statusFilter === "pending" ? "warning" : "success"
                          }
                        >
                          {statusFilter === "pending"
                            ? "Pending"
                            : `Graded (${assessment.marksObtained || 0}/${assessment.task?.maxMarks || 0})`}
                        </Badge>
                      </td>
                      <td className="py-4 text-right">
                        <Link to={`/faculty/assessments/${assessment.id}`}>
                          <Button
                            size="sm"
                            variant={
                              statusFilter === "pending"
                                ? "primary"
                                : "secondary"
                            }
                          >
                            {statusFilter === "pending" ? "Grade Now" : "View"}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  );
};

export default Gradebook;
