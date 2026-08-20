import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import api from "../../lib/api";

export default function AdminProvisioningPanel() {
  const queryClient = useQueryClient();

  const {
    data: pendingAdmins,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pending-admins"],
    queryFn: () =>
      api.get("/api/superadmin/pending-admins").then((res) => res.data.data),
  });

  const approveMutation = useMutation({
    mutationFn: (systemId) =>
      api.post("/api/superadmin/approve-admin", { system_id: systemId }),
    onSuccess: (data) => {
      Swal.fire({
        icon: "success",
        title: "Authorized",
        text: data.message,
        background: "#0f172a",
        color: "white",
      });
      queryClient.invalidateQueries(["pending-admins"]);
    },
    onError: () => {
      Swal.fire("Error", "Server failed to process authorization.", "error");
    },
  });

  const denyMutation = useMutation({
    mutationFn: (systemId) =>
      api.post("/api/admin/deny-user", { temp_system_id: systemId }),
    onSuccess: () => {
      Swal.fire({
        icon: "success",
        title: "Denied",
        text: "User request denied and archived.",
        background: "#0f172a",
        color: "white",
      });
      queryClient.invalidateQueries(["pending-admins"]);
    },
  });

  const handleApprove = (systemId) => {
    Swal.fire({
      title: "Authorize Admin?",
      text: `This will grant ${systemId} full LGU Admin privileges.`,
      icon: "warning",
      background: "#0f172a",
      color: "white",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Yes, Authorize",
    }).then((result) => {
      if (result.isConfirmed) {
        approveMutation.mutate(systemId);
      }
    });
  };

  const handleDeny = (systemId) => {
    Swal.fire({
      title: "Deny Request?",
      text: "This will archive the pending admin request.",
      icon: "warning",
      background: "#0f172a",
      color: "white",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Deny",
    }).then((result) => {
      if (result.isConfirmed) {
        denyMutation.mutate(systemId);
      }
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">
        LGU Admin Security Provisioning
      </h2>
      <p className="text-slate-400 mb-6">
        Verify and approve pending LGU IT personnel and HR Admins.
      </p>

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900">
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  System ID
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Full Name
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  HR Emp ID
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Role Request
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Loading Secure Uplink...
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-red-400">
                    Database Connection Failed.
                  </td>
                </tr>
              )}
              {!isLoading && !error && pendingAdmins?.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No pending LGU Admin requests found.
                  </td>
                </tr>
              )}
              {!isLoading &&
                !error &&
                pendingAdmins?.map((admin) => (
                  <tr
                    key={admin.system_id}
                    className="border-b border-slate-800 hover:bg-slate-900/50"
                  >
                    <td className="px-4 py-3 font-bold text-white">
                      {admin.system_id}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {admin.first_name} {admin.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {admin.employee_hr_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500 rounded text-xs font-bold uppercase">
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500 rounded text-xs font-bold">
                        PENDING
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={() => handleApprove(admin.system_id)}
                        className="bg-green-500/10 text-green-400 border border-green-500 px-3 py-1 rounded text-sm font-bold hover:bg-green-500 hover:text-slate-950 transition"
                      >
                        Authorize
                      </button>
                      <button
                        onClick={() => handleDeny(admin.system_id)}
                        className="bg-red-500/10 text-red-400 border border-red-500 px-3 py-1 rounded text-sm font-bold hover:bg-red-500 hover:text-white transition"
                      >
                        Deny
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
