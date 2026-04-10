import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Session {
  id: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  loginTime: string;
  lastActivity: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export const SessionsPanel: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ userId: '', deviceType: '' });

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filter.userId) params.append('userId', filter.userId);
      if (filter.deviceType) params.append('deviceType', filter.deviceType);
      
      // Note: Backend endpoint may use /v1 prefix like /api/v1/admin/auth/sessions
      const response = await axios.get(`/api/v1/admin/auth/sessions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(response.data.data.sessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Active Sessions</h2>
      
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Filter by User ID"
          className="border rounded px-3 py-2"
          value={filter.userId}
          onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
        />
        <select
          className="border rounded px-3 py-2"
          value={filter.deviceType}
          onChange={(e) => setFilter({ ...filter, deviceType: e.target.value })}
        >
          <option value="">All Devices</option>
          <option value="desktop">Desktop</option>
          <option value="mobile">Mobile</option>
          <option value="tablet">Tablet</option>
        </select>
        <button
          onClick={() => setFilter({ userId: '', deviceType: '' })}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Clear Filters
        </button>
      </div>
      
      {/* Sessions Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">User</th>
                <th className="px-4 py-2 border">Device</th>
                <th className="px-4 py-2 border">Browser/OS</th>
                <th className="px-4 py-2 border">IP Address</th>
                <th className="px-4 py-2 border">Login Time</th>
                <th className="px-4 py-2 border">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">
                    <div className="font-medium">{session.user.fullName || session.user.email}</div>
                    <div className="text-sm text-gray-500">{session.user.email}</div>
                    <div className="text-xs text-gray-400">{session.user.role}</div>
                  </td>
                  <td className="px-4 py-2 border capitalize">{session.deviceType}</td>
                  <td className="px-4 py-2 border">
                    {session.browser} / {session.os}
                  </td>
                  <td className="px-4 py-2 border">{session.ipAddress}</td>
                  <td className="px-4 py-2 border">{formatDate(session.loginTime)}</td>
                  <td className="px-4 py-2 border">{formatDate(session.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
