import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, HardDrive, FileJson2 } from "lucide-react";
import api from "../../lib/api";

export default function SystemHealthPanel() {
  const {
    data: health,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["superadmin-health"],
    queryFn: () =>
      api.get("/api/superadmin/health").then((res) => res.data.data),
    refetchInterval: 5000,
  });

  const stats = [
    {
      title: "System Status",
      value: health ? "OPTIMAL" : "OFFLINE",
      color: health ? "text-green-400" : "text-red-400",
      icon: CheckCircle,
      iconColor: health ? "text-green-400" : "text-red-400",
    },
    {
      title: "Server Uptime (sec)",
      value: health?.uptime ?? "--",
      color: "text-cyan-400",
      icon: Clock,
      iconColor: "text-cyan-400",
    },
    {
      title: "Total Database Size",
      value: health ? `${health.db_size} MB` : "-- MB",
      color: "text-amber-400",
      icon: HardDrive,
      iconColor: "text-amber-400",
    },
    {
      title: "Total Master Records",
      value: health?.total_records ?? "--",
      color: "text-purple-400",
      icon: FileJson2,
      iconColor: "text-purple-400",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">Server Telemetry</h2>
      <p className="text-slate-400 mb-6">
        Live diagnostics of the Node.js backend and MySQL database connection.
      </p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">
                {stat.title}
              </p>
              <h3 className={`text-2xl font-bold mt-1 ${stat.color}`}>
                {isLoading ? "--" : stat.value}
              </h3>
            </div>
            <stat.icon className={`w-8 h-8 ${stat.iconColor}`} />
          </div>
        ))}
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Live API Traffic</h3>
        <div className="h-64 border border-dashed border-slate-700 rounded-lg flex items-center justify-center text-slate-600">
          [ Network Traffic Visualizer Mount Point ]
        </div>
      </div>
    </div>
  );
}
