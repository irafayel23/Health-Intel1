import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SquareTerminal,
  Activity,
  Eye,
  ShieldAlert,
  DatabaseBackup,
  Power,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import SystemHealthPanel from "./SystemHealthPanel";
import AuditTrailPanel from "./AuditTrailPanel";
import AdminProvisioningPanel from "./AdminProvisioningPanel";
import DatabaseControlPanel from "./DatabaseControlPanel";

export default function SuperAdminDashboardPage() {
  const [activeView, setActiveView] = useState("health");
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { id: "health", label: "System Health", icon: Activity },
    { id: "audit", label: "Security Audit Trail", icon: Eye },
    { id: "admins", label: "LGU Admin Provisioning", icon: ShieldAlert },
    { id: "backups", label: "Database Control", icon: DatabaseBackup },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 text-cyan-400">
          <SquareTerminal className="w-7 h-7" />
          <h2 className="text-lg font-bold tracking-wider">SUPER ADMIN</h2>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-3 px-6 py-3 text-left font-bold transition border-l-4 ${
                activeView === item.id
                  ? "bg-slate-800 text-cyan-400 border-cyan-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white border-transparent"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500 font-bold py-2 px-4 rounded-md transition"
          >
            <Power className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold tracking-wide">
            SUPERVISED OPERATIONS CENTER
          </h1>
          <div className="text-sm text-slate-500">
            Clearance Level:{" "}
            <span className="font-bold text-purple-400">OMEGA</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {activeView === "health" && <SystemHealthPanel />}
          {activeView === "audit" && <AuditTrailPanel />}
          {activeView === "admins" && <AdminProvisioningPanel />}
          {activeView === "backups" && <DatabaseControlPanel />}
        </main>
      </div>
    </div>
  );
}
