import { useState, useEffect } from "react";
import { studentService } from "@/services/student";
import { useNavigate } from "react-router-dom";
import { GlassCard, Badge, Button } from "@/components/ui";
import { BookOpen, Play, CheckCircle, Trophy } from "lucide-react";
import toast from "react-hot-toast";

const AllSkillsPage = () => {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await studentService.getMySkills();
      if (res.success) {
        setSkills(
          Array.isArray(res.data) 
            ? res.data 
            : (res.data?.skills || res.data?.items || [])
        );
      }
    } catch (e) {
      toast.error("Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
          Explore Skills
        </h1>
        <p className="text-slate-500 mt-1">
          Browse all available skills and track your progress.
        </p>
      </div>

      {skills.length === 0 ? (
        <GlassCard variant="secondary" padding="lg">
          <div className="text-center py-10 text-slate-500">
            <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
            <p>No skills available at the moment.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => {
            const enrollment = skill.enrollment || skill.studentSkills?.[0];
            const isEnrolled = !!enrollment;
            const progress = enrollment?.progress || enrollment?.progressPercentage || 0;
            const tasksCompleted = enrollment?.tasksCompleted || enrollment?.totalTasksCompleted || 0;
            const marksObtained = enrollment?.marksObtained || enrollment?.totalMarksObtained || 0;

            return (
              <GlassCard
                key={skill.id}
                variant="secondary"
                className={`group overflow-hidden flex flex-col h-full transition-all duration-300 ${!isEnrolled ? 'opacity-75 grayscale-[0.5]' : 'hover:scale-[1.02]'}`}
              >
                <div className="aspect-video bg-slate-200 relative overflow-hidden">
                  <img
                    src={
                      skill.thumbnailUrl ||
                      `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80`
                    }
                    alt={skill.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge variant="purple">{skill.skillCode}</Badge>
                    {!isEnrolled && <Badge variant="secondary" className="bg-slate-800/80 text-white backdrop-blur-md border-none">Not Enrolled</Badge>}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-800 text-lg mb-2">
                    {skill.name}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <CheckCircle size={14} />{" "}
                      {tasksCompleted} Tasks
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy size={14} /> {marksObtained}{" "}
                      Marks
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-auto">
                    {isEnrolled ? (
                      <>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium text-purple-600">Enrolled Progress</span>
                          <span className="font-bold text-slate-700">
                            {Math.round(Number(progress))}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100/50 rounded-full overflow-hidden mb-4 border border-slate-200/50">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000"
                            style={{
                              width: `${Number(progress)}%`,
                            }}
                          />
                        </div>
                        <Button
                          variant="primary"
                          fullWidth
                          leftIcon={<Play size={16} />}
                          onClick={() => navigate(`/student/skills/${skill.id}`)}
                        >
                          Continue Learning
                        </Button>
                      </>
                    ) : (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          fullWidth
                          disabled
                          className="bg-slate-100/50 text-slate-400 border-dashed"
                        >
                          Enrollment Required
                        </Button>
                        <p className="text-[10px] text-center text-slate-400 mt-2">Contact Admin to enroll in this skill</p>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AllSkillsPage;
