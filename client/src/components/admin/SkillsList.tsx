import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface Skill {
  id: string;
  skill_code: string;
  name: string;
  description: string;
  duration_weeks: number;
  status: string;
  thumbnail_url: string | null;
  stats: {
    total_chapters: number;
    total_tasks: number;
    total_faculty: number;
    total_students: number;
  };
  created_at: string;
}

export const SkillsList: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
  });

  useEffect(() => {
    fetchSkills();
  }, [pagination.page, filters]);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/admin/skills', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: filters.status,
          search: filters.search || undefined,
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setSkills(response.data.data.skills);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination.total,
        totalPages: response.data.data.pagination.totalPages,
        hasNext: response.data.data.pagination.hasNext,
        hasPrev: response.data.data.pagination.hasPrev,
      }));
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (skillId: string, skillName: string) => {
    if (!confirm(`Are you sure you want to archive "${skillName}"?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/v1/admin/skills/${skillId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Skill archived successfully');
      fetchSkills();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to archive skill');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-200 text-gray-800',
      pending_approval: 'bg-yellow-200 text-yellow-800',
      approved: 'bg-green-200 text-green-800',
      rejected: 'bg-red-200 text-red-800',
      active: 'bg-blue-200 text-blue-800',
      archived: 'bg-gray-400 text-white',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-200'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Skills Management</h1>
        <Link
          to="/admin/skills/create"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Create New Skill
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, code, or description..."
              className="w-full border rounded px-3 py-2"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, status: filters.status })}
            />
          </div>
          <select
            className="border rounded px-3 py-2"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <button
            onClick={() => setFilters({ status: 'all', search: '' })}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Skills Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Thumb</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Stats</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((skill) => (
                  <tr key={skill.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {skill.thumbnail_url ? (
                        <img src={`http://localhost:5000${skill.thumbnail_url}`} alt={skill.name} className="w-12 h-8 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center text-xs">No img</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{skill.skill_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{skill.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{skill.description}</div>
                    </td>
                    <td className="px-4 py-3">{skill.duration_weeks} weeks</td>
                    <td className="px-4 py-3">{getStatusBadge(skill.status)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>📚 {skill.stats?.total_chapters || 0} chapters</div>
                      <div>📝 {skill.stats?.total_tasks || 0} tasks</div>
                      <div>👨‍🏫 {skill.stats?.total_faculty || 0} faculty</div>
                      <div>👨‍🎓 {skill.stats?.total_students || 0} students</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{new Date(skill.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/skills/${skill.id}`}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          View
                        </Link>
                        <Link
                          to={`/admin/skills/${skill.id}/edit`}
                          className="text-green-500 hover:text-green-700"
                        >
                          Edit
                        </Link>
                        {skill.status !== 'archived' && (
                          <button
                            onClick={() => handleDelete(skill.id, skill.name)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} skills
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={!pagination.hasPrev}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={!pagination.hasNext}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
