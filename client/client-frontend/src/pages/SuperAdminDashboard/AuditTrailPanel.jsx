import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import api from "../../lib/api";

export default function AuditTrailPanel() {
  //const queryClient = useQueryClient();

  const {
    data: logs,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () =>
      api.get("/api/superadmin/audit-logs").then((res) => res.data.data),
  });

  const handleRefresh = () => {
    refetch();
  };

  const badgeClass = (role) => {
    if (role === "Super Admin")
      return "bg-purple-500/20 text-purple-400 border-purple-500";
    if (role === "LGU Admin")
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500";
    return "bg-green-500/20 text-green-400 border-green-500";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Immutable Audit Trail
          </h2>
          <p className="text-slate-400">
            Permanent ledger of all actions performed by Admins, MHOs, and BHWs.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-transparent text-cyan-400 border border-cyan-400 px-4 py-2 rounded-md font-bold hover:bg-cyan-400 hover:text-slate-950 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Ledger
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900">
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  User ID
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Clearance Role
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Action Executed
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  System Details
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    Loading ledger...
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-red-400">
                    Failed to retrieve immutable ledger.
                  </td>
                </tr>
              )}
              {!isLoading && !error && logs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    No audit logs found.
                  </td>
                </tr>
              )}
              {!isLoading &&
                !error &&
                logs?.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-800 hover:bg-slate-900/50"
                  >
                    <td className="px-4 py-3 text-slate-500 font-mono text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-white">
                      {log.user_id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold border ${badgeClass(log.role)}`}
                      >
                        {log.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sky-400">{log.action}</td>
                    <td className="px-4 py-3 text-slate-300">{log.details}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
