/**
 * ============================================================
 * CREATE/EDIT SKILL FORM COMPONENT
 * ============================================================
 *
 * A comprehensive form for creating and editing skills with:
 * - Full form validation using react-hook-form + Zod
 * - File upload for skill thumbnail/cover images
 * - Faculty member multi-select assignment
 * - Status selection
 * - Loading and error states
 * - Beautiful glassmorphism UI
 *
 * ============================================================
 */

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
  Button,
} from "@/components/ui";
import { adminService } from "@/services/admin";
import type { Skill, User } from "@/types";
import { Upload, X, Loader2 } from "lucide-react";

/**
 * Zod validation schema for skill creation/editing
 * Ensures all data meets requirements before submission
 */
const skillFormSchema = z.object({
  skillCode: z
    .string()
    .min(1, "Skill code is required")
    .max(20, "Skill code must be 20 characters or less")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Skill code must contain only uppercase letters, numbers, hyphens, and underscores",
    ),
  name: z
    .string()
    .min(1, "Skill name is required")
    .max(100, "Skill name must be 100 characters or less"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be 1000 characters or less"),
  durationWeeks: z
    .number()
    .min(1, "Duration must be at least 1 week")
    .max(52, "Duration must be 52 weeks or less"),
  facultyIds: z
    .array(z.string())
    .min(1, "At least one faculty member must be assigned"),
  primaryFacultyId: z.string().optional(),
  status: z.enum(["draft", "pending_approval", "approved"]),
});

type SkillFormData = z.infer<typeof skillFormSchema>;

interface CreateEditSkillProps {
  skill?: Skill;
  onSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

/**
 * CreateEditSkill Component
 *
 * @param skill - Optional existing skill for edit mode
 * @param onSuccess - Callback after successful submission
 * @param onCancel - Callback to close modal/cancel
 * @param isModal - Whether displayed in modal context
 */
const CreateEditSkill: React.FC<CreateEditSkillProps> = ({
  skill,
  onSuccess,
  onCancel,
  isModal = false,
}) => {
  const isEditMode = !!skill;
  const [loading, setLoading] = useState(false);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    skill?.thumbnailUrl || null,
  );
  const [imageError, setImageError] = useState<string>("");

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<SkillFormData>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: {
      skillCode: skill?.skillCode || "",
      name: skill?.name || "",
      description: skill?.description || "",
      durationWeeks: skill?.durationWeeks || 4,
      facultyIds: skill?.faculty?.map((f) => f.facultyId) || [],
      primaryFacultyId:
        skill?.faculty?.find((f) => f.isPrimary)?.facultyId || "",
      status: (skill?.status as any) || "draft",
    },
  });

  const selectedFacultyIds = watch("facultyIds");

  /**
   * Fetch faculty members on component mount
   */
  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        setFacultyLoading(true);
        // Fetch users with faculty role
        const res = await adminService.getUsers({
          role: "faculty",
          limit: 1000,
        });

        if (res.success) {
          const facultyList = Array.isArray(res.data?.items)
            ? res.data.items
            : Array.isArray(res.data)
              ? res.data
              : [];
          setFaculty(facultyList);
        }
      } catch (error: any) {
        console.error("Failed to fetch faculty:", error);
        toast.error("Failed to load faculty members");
      } finally {
        setFacultyLoading(false);
      }
    };

    fetchFaculty();
  }, []);

  /**
   * Handle thumbnail/cover image upload
   * Validates file type and size
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setImageError("");

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setImageError("Please upload a valid image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image size must be less than 5MB");
      return;
    }

    setThumbnail(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Remove uploaded image
   */
  const handleRemoveImage = () => {
    setThumbnail(null);
    setThumbnailPreview(null);
    setImageError("");
  };

  /**
   * Handle form submission
   * Creates or updates skill based on mode
   */
  const onSubmit = async (data: SkillFormData) => {
    try {
      setLoading(true);

      // Prepare FormData for multipart request (due to file upload)
      const formData = new FormData();
      formData.append("skillCode", data.skillCode);
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("durationWeeks", String(data.durationWeeks));
      formData.append("status", data.status);

      // Add faculty IDs as JSON array
      formData.append("facultyIds", JSON.stringify(data.facultyIds));

      if (data.primaryFacultyId) {
        formData.append("primaryFacultyId", data.primaryFacultyId);
      }

      // Add thumbnail if selected
      if (thumbnail) {
        formData.append("thumbnail", thumbnail);
      }

      let response;

      if (isEditMode && skill) {
        // Update existing skill
        response = await adminService.updateSkill(skill.id, formData);
      } else {
        // Create new skill
        response = await adminService.createSkill(formData);
      }

      if (response.success) {
        toast.success(
          isEditMode
            ? "Skill updated successfully"
            : "Skill created successfully",
        );

        // Reset form and cleanup
        reset();
        handleRemoveImage();

        // Call success callback
        if (onSuccess) {
          onSuccess();
        } else {
          // Redirect to skills list if not in modal
          if (!isModal) {
            // Navigation would happen here if using React Router
          }
        }
      } else {
        toast.error(response.error || "Failed to save skill");
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        (isEditMode ? "Failed to update skill" : "Failed to create skill");
      toast.error(errorMessage);
      console.error("Skill submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard
      variant="secondary"
      padding="lg"
      className={isModal ? "" : "max-w-4xl"}
    >
      <GlassCardHeader
        title={isEditMode ? "Edit Skill" : "Create New Skill"}
        subtitle={
          isEditMode
            ? "Update skill information and faculty assignments"
            : "Create a new skill by filling in the details below"
        }
      />

      <GlassCardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Skill Code and Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skill Code */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Skill Code
                <span className="text-red-500">*</span>
              </label>
              <input
                {...register("skillCode")}
                type="text"
                placeholder="e.g., REACT-101"
                disabled={isEditMode} // Prevent editing skill code
                className={`w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border rounded-xl outline-none transition-all duration-200 ${
                  errors.skillCode
                    ? "border-red-400 focus:ring-2 focus:ring-red-500"
                    : "border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                } ${isEditMode ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
              />
              {errors.skillCode && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.skillCode.message}
                </p>
              )}
            </div>

            {/* Skill Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Skill Name
                <span className="text-red-500">*</span>
              </label>
              <input
                {...register("name")}
                type="text"
                placeholder="e.g., React Fundamentals"
                className={`w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border rounded-xl outline-none transition-all duration-200 ${
                  errors.name
                    ? "border-red-400 focus:ring-2 focus:ring-red-500"
                    : "border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                }`}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
              <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register("description")}
              placeholder="Provide a detailed description of the skill"
              rows={4}
              className={`w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border rounded-xl outline-none transition-all duration-200 resize-none ${
                errors.description
                  ? "border-red-400 focus:ring-2 focus:ring-red-500"
                  : "border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              }`}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
            <p className="text-slate-500 text-xs mt-1">
              {watch("description")?.length || 0}/1000 characters
            </p>
          </div>

          {/* Duration and Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Duration (Weeks)
                <span className="text-red-500">*</span>
              </label>
              <input
                {...register("durationWeeks", { valueAsNumber: true })}
                type="number"
                min="1"
                max="52"
                className={`w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border rounded-xl outline-none transition-all duration-200 ${
                  errors.durationWeeks
                    ? "border-red-400 focus:ring-2 focus:ring-red-500"
                    : "border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                }`}
              />
              {errors.durationWeeks && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.durationWeeks.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
                <span className="text-red-500">*</span>
              </label>
              <select
                {...register("status")}
                className={`w-full px-4 py-2.5 bg-white/50 backdrop-blur-sm border rounded-xl outline-none transition-all duration-200 ${
                  errors.status
                    ? "border-red-400 focus:ring-2 focus:ring-red-500"
                    : "border-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                }`}
              >
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
              </select>
              {errors.status && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Thumbnail/Cover Image (Optional)
            </label>
            <div className="flex gap-4">
              {/* Image Upload Area */}
              <div className="flex-1">
                <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-purple-400 transition-colors bg-white/30 hover:bg-white/50">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700">
                      Click to upload image
                    </p>
                    <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={loading}
                  />
                </label>
                {imageError && (
                  <p className="text-red-500 text-sm mt-1">{imageError}</p>
                )}
              </div>

              {/* Image Preview */}
              {thumbnailPreview && (
                <div className="relative w-32 h-32">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Faculty Assignment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assign Faculty Members
              <span className="text-red-500">*</span>
            </label>

            {facultyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-purple-500 mr-2" />
                <p className="text-slate-600">Loading faculty members...</p>
              </div>
            ) : faculty.length === 0 ? (
              <p className="text-red-500 text-sm">
                No faculty members available
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto bg-white/30 p-3 rounded-lg border border-slate-200">
                {faculty.map((facultyMember) => (
                  <label
                    key={facultyMember.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded transition-colors"
                  >
                    <Controller
                      control={control}
                      name="facultyIds"
                      render={({ field: { value, onChange } }) => (
                        <input
                          type="checkbox"
                          checked={value.includes(facultyMember.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onChange([...value, facultyMember.id]);
                            } else {
                              onChange(
                                value.filter((id) => id !== facultyMember.id),
                              );
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                        />
                      )}
                    />
                    <span className="flex-1 text-sm text-slate-700">
                      {facultyMember.fullName}
                      <span className="text-slate-500 ml-2">
                        ({facultyMember.email})
                      </span>
                    </span>

                    {/* Primary Faculty Selector */}
                    {selectedFacultyIds.includes(facultyMember.id) && (
                      <Controller
                        control={control}
                        name="primaryFacultyId"
                        render={({ field: { value, onChange } }) => (
                          <select
                            value={value === facultyMember.id ? "primary" : ""}
                            onChange={(e) => {
                              onChange(
                                e.target.value === "primary"
                                  ? facultyMember.id
                                  : "",
                              );
                            }}
                            className="text-xs px-2 py-1 border border-slate-200 rounded bg-white/50"
                          >
                            <option value="">Regular</option>
                            <option value="primary">Primary</option>
                          </select>
                        )}
                      />
                    )}
                  </label>
                ))}
              </div>
            )}

            {errors.facultyIds && (
              <p className="text-red-500 text-sm mt-1">
                {errors.facultyIds.message}
              </p>
            )}

            {/* Selected Faculty Summary */}
            {selectedFacultyIds.length > 0 && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-900 mb-2">
                  Selected Faculty ({selectedFacultyIds.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedFacultyIds.map((id) => {
                    const member = faculty.find((f) => f.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-200 text-purple-900 rounded text-xs font-medium"
                      >
                        {member?.fullName}
                        {watch("primaryFacultyId") === id && (
                          <span className="text-purple-700 font-bold">★</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                handleRemoveImage();
                if (onCancel) onCancel();
              }}
              disabled={loading}
            >
              {isModal ? "Cancel" : "Reset"}
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isEditMode ? "Update Skill" : "Create Skill"}
            </Button>
          </div>
        </form>
      </GlassCardContent>
    </GlassCard>
  );
};

export default CreateEditSkill;
