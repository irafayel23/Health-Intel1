import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import api from "../../lib/api";

export default function UserManagementPanel() {
  const [subView, setSubView] = useState("pending"); // 'pending' | 'archived'
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [assignedRole, setAssignedRole] = useState("bhw");
  const queryClient = useQueryClient();

  // Fetch pending users
  const { data: pendingUsers, isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-users"],
    queryFn: () =>
      api.get("/api/admin/pending-users").then((res) => res.data.data),
  });

  // Fetch denied/archived users
  const { data: deniedUsers, isLoading: deniedLoading } = useQuery({
    queryKey: ["denied-users"],
    queryFn: () =>
      api.get("/api/admin/denied-users").then((res) => res.data.data),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (payload) => api.post("/api/admin/approve-user", payload),
    onSuccess: () => {
      Swal.fire("Success", "User approved successfully", "success");
      queryClient.invalidateQueries(["pending-users"]);
      queryClient.invalidateQueries(["denied-users"]);
      setApproveModalOpen(false);
    },
    onError: (error) => {
      Swal.fire(
        "Error",
        error.response?.data?.error || "Failed to approve user",
        "error",
      );
    },
  });

  // Deny mutation
  const denyMutation = useMutation({
    mutationFn: (id) =>
      api.post("/api/admin/deny-user", { temp_system_id: id }),
    onSuccess: () => {
      Swal.fire("Success", "User denied", "success");
      queryClient.invalidateQueries(["pending-users"]);
      queryClient.invalidateQueries(["denied-users"]);
    },
  });

  // Undo deny mutation
  const undoDenyMutation = useMutation({
    mutationFn: (id) =>
      api.post("/api/admin/undo-deny", { temp_system_id: id }),
    onSuccess: () => {
      Swal.fire("Success", "User restored", "success");
      queryClient.invalidateQueries(["pending-users"]);
      queryClient.invalidateQueries(["denied-users"]);
    },
  });

  const openApproveModal = (systemId) => {
    setSelectedUserId(systemId);
    setApproveModalOpen(true);
  };

  const handleApprove = () => {
    approveMutation.mutate({
      temp_system_id: selectedUserId,
      assigned_role: assignedRole,
    });
  };

  const renderPendingTable = () => {
    if (pendingLoading)
      return <div className="text-center py-8">Loading...</div>;
    if (!pendingUsers || pendingUsers.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No pending approvals
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                System ID
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Full Name
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Employee ID
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.map((user) => (
              <tr
                key={user.system_id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {user.system_id}
                </td>
                <td className="px-4 py-3">
                  {user.first_name} {user.last_name}
                </td>
                <td className="px-4 py-3">{user.employee_hr_id}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-bold">
                    PENDING
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => openApproveModal(user.system_id)}
                    className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded text-sm font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => denyMutation.mutate(user.system_id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold"
                  >
                    Deny
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDeniedTable = () => {
    if (deniedLoading)
      return <div className="text-center py-8">Loading...</div>;
    if (!deniedUsers || deniedUsers.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">No archived users</div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                System ID
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Full Name
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {deniedUsers.map((user) => (
              <tr
                key={user.system_id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 text-gray-600">{user.system_id}</td>
                <td className="px-4 py-3 text-gray-600">
                  {user.first_name} {user.last_name}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">
                    ARCHIVED
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => undoDenyMutation.mutate(user.system_id)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm font-semibold"
                  >
                    Restore User
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">User Management</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
          <button
            onClick={() => setSubView("pending")}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              subView === "pending"
                ? "bg-sky-100 text-sky-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Pending Approvals
          </button>
          <button
            onClick={() => setSubView("archived")}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              subView === "archived"
                ? "bg-sky-100 text-sky-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Archived / Denied
          </button>
        </div>
        {subView === "pending" ? renderPendingTable() : renderDeniedTable()}
      </div>

      {/* Approve Modal */}
      {approveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Approve Employee Account
            </h3>
            <input type="hidden" value={selectedUserId} />
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign Role
            </label>
            <select
              value={assignedRole}
              onChange={(e) => setAssignedRole(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="bhw">Barangay Health Worker (BHW)</option>
              <option value="mho">Municipal Health Officer (MHO)</option>
              <option value="admin">LGU Admin</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-md transition"
              >
                {approveMutation.isPending ? "Processing..." : "Approve & Save"}
              </button>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-md transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
