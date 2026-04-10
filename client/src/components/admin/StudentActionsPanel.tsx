import React, { useState } from 'react';
import axios from 'axios';

interface Student {
  id: string;
  full_name: string;
  email: string;
  username: string;
  is_blocked: boolean;
}

interface StudentActionsPanelProps {
  student: Student;
  onActionComplete: () => void;
}

export const StudentActionsPanel: React.FC<StudentActionsPanelProps> = ({ student, onActionComplete }) => {
  const [loading, setLoading] = useState(false);
  const [showForceLogoutModal, setShowForceLogoutModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reason, setReason] = useState('');
  // const [newPassword, setNewPassword] = useState<string | null>(null);

  const handleForceLogout = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Adding /v1 prefix as configured in backend
      await axios.post(
        `/api/v1/admin/auth/users/${student.id}/force-logout`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Student logged out successfully');
      setShowForceLogoutModal(false);
      setReason('');
      onActionComplete();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to force logout');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/v1/admin/auth/users/${student.id}/reset-password`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // setNewPassword(response.data.data?.newPassword);
      alert(`New password: ${response.data.data?.newPassword}\nPlease save this password and share with student.`);
      onActionComplete();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/v1/admin/auth/users/${student.id}/block`,
        { block: !student.is_blocked, reason: reason || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(student.is_blocked ? 'Student unblocked' : 'Student blocked');
      setShowBlockModal(false);
      setReason('');
      onActionComplete();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to update block status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Student Actions</h3>
      <div className="space-y-3">
        <button
          onClick={() => setShowForceLogoutModal(true)}
          className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          disabled={loading}
        >
          Force Logout
        </button>
        
        <button
          onClick={handleResetPassword}
          className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          disabled={loading}
        >
          Reset Password
        </button>
        
        <button
          onClick={() => setShowBlockModal(true)}
          className={`w-full px-4 py-2 rounded ${
            student.is_blocked 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-orange-500 hover:bg-orange-600'
          } text-white`}
          disabled={loading}
        >
          {student.is_blocked ? 'Unblock Student' : 'Block Student'}
        </button>
      </div>

      {/* Force Logout Modal */}
      {showForceLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Force Logout Student</h3>
            <p className="text-gray-600 mb-4">Student: {student.full_name}</p>
            <textarea
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Reason for force logout..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForceLogoutModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleForceLogout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Force Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && !student.is_blocked && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Block Student</h3>
            <p className="text-gray-600 mb-4">Student: {student.full_name}</p>
            <textarea
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Reason for blocking..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleBlock}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Block Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
