import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

interface Faculty {
  id: string;
  fullName: string;
  full_name?: string; // in case of backend differences
  email: string;
}

export const SkillForm: React.FC = () => {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!skillId;
  
  const [loading, setLoading] = useState(false);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    skill_code: '',
    name: '',
    description: '',
    duration_weeks: 4,
    facultyIds: [] as string[],
    primaryFacultyId: '',
  });

  useEffect(() => {
    fetchFaculties();
    if (isEdit) {
      fetchSkill();
    }
  }, [isEdit, skillId]);

  const fetchFaculties = async () => {
    try {
      const token = localStorage.getItem('token');
      // Adjusting endpoint if faculty fetching exists, else assuming it's standard
      const response = await axios.get('/api/v1/faculty', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // In this system, possibly response.data.data or response.data.faculty
      setFaculties(response.data.data || response.data.faculty || []);
    } catch (error) {
      console.error('Failed to fetch faculties:', error);
    }
  };

  const fetchSkill = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v1/admin/skills/${skillId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const skill = response.data;
      setFormData({
        skill_code: skill.skill_code,
        name: skill.name,
        description: skill.description,
        duration_weeks: skill.duration_weeks,
        facultyIds: skill.facultyAssignments?.map((f: any) => f.facultyId) || [],
        primaryFacultyId: skill.facultyAssignments?.find((f: any) => f.isPrimary)?.facultyId || '',
      });
      if (skill.thumbnail_url) {
        setThumbnailPreview(`http://localhost:5000${skill.thumbnail_url}`);
      }
    } catch (error) {
      console.error('Failed to fetch skill:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      let createdSkillId = skillId;
      if (isEdit) {
        await axios.put(`/api/v1/admin/skills/${skillId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        const response = await axios.post('/api/v1/admin/skills', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        createdSkillId = response.data.skill?.id || response.data.data?.id;
      }
      
      // Upload thumbnail if selected
      if (thumbnail && createdSkillId) {
        const formDataThumb = new FormData();
        formDataThumb.append('thumbnail', thumbnail);
        await axios.post(`/api/v1/admin/skills/${createdSkillId}/thumbnail`, formDataThumb, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      }
      
      alert(isEdit ? 'Skill updated successfully!' : 'Skill created successfully!');
      navigate('/admin/skills');
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to save skill');
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? 'Edit Skill' : 'Create New Skill'}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Skill Code *</label>
              <input
                type="text"
                required
                className="w-full border rounded px-3 py-2"
                value={formData.skill_code}
                onChange={(e) => setFormData({ ...formData, skill_code: e.target.value.toUpperCase() })}
                placeholder="SK-PYTHON-001"
                disabled={isEdit}
              />
              <p className="text-xs text-gray-500 mt-1">Unique code, uppercase letters, numbers, and hyphens only</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Skill Name *</label>
              <input
                type="text"
                required
                className="w-full border rounded px-3 py-2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Python Programming Lab"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              required
              rows={5}
              className="w-full border rounded px-3 py-2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="A comprehensive description of the skill..."
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 50 characters</p>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Duration (weeks) *</label>
            <input
              type="number"
              required
              min="1"
              max="52"
              className="w-32 border rounded px-3 py-2"
              value={formData.duration_weeks}
              onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) })}
            />
          </div>
        </div>
        
        {/* Thumbnail Upload */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Thumbnail Image</h2>
          
          <div className="flex gap-4">
            {thumbnailPreview && (
              <div className="w-40">
                <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-auto object-cover rounded shadow" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleThumbnailChange}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 800x450px, max 2MB. JPEG, PNG, or WEBP</p>
            </div>
          </div>
        </div>
        
        {/* Faculty Assignment */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Faculty Assignment</h2>
          
          <div className="space-y-3">
            {faculties.map((faculty) => (
              <div key={faculty.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.facultyIds.includes(faculty.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        facultyIds: [...formData.facultyIds, faculty.id]
                      });
                    } else {
                      setFormData({
                        ...formData,
                        facultyIds: formData.facultyIds.filter(id => id !== faculty.id),
                        primaryFacultyId: formData.primaryFacultyId === faculty.id ? '' : formData.primaryFacultyId
                      });
                    }
                  }}
                />
                <span className="flex-1">{faculty.fullName || faculty.full_name} ({faculty.email})</span>
                {formData.facultyIds.includes(faculty.id) && (
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="primaryFaculty"
                      checked={formData.primaryFacultyId === faculty.id}
                      onChange={() => setFormData({ ...formData, primaryFacultyId: faculty.id })}
                    />
                    <span className="text-sm">Primary</span>
                  </label>
                )}
              </div>
            ))}
          </div>
          
          {formData.facultyIds.length === 0 && (
            <p className="text-yellow-600 text-sm mt-2">⚠️ At least one faculty should be assigned to this skill</p>
          )}
        </div>
        
        {/* Submit Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/skills')}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formData.facultyIds.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isEdit ? 'Update Skill' : 'Create Skill')}
          </button>
        </div>
      </form>
    </div>
  );
};
