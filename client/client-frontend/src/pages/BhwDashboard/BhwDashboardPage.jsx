import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldPlus,
  LayoutDashboard,
  Users,
  Map,
  Activity,
  FileText,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import OverviewPanel from "./OverviewPanel";
import PatientRecordsPanel from "./PatientRecordsPanel";
import HeatmapPanel from "./HeatmapPanel";
import ProgramsPanel from "./ProgramsPanel";
import ReportsPanel from "./ReportsPanel";

export default function BhwDashboardPage() {
  const [activeView, setActiveView] = useState("dashboard");
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "patients", label: "Patient Records", icon: Users },
    { id: "heatmap", label: "Heatmap Cases", icon: Map },
    { id: "programs", label: "Programs", icon: Activity },
    { id: "reports", label: "Brgy Reports", icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <ShieldPlus className="w-7 h-7 text-sky-400" />
          <h2 className="text-lg font-bold tracking-wider">HEALTH-INTEL</h2>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-3 px-6 py-3 text-left font-bold transition ${
                activeView === item.id
                  ? "bg-slate-700 text-white border-l-4 border-sky-400"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white border-l-4 border-transparent"
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
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">
            Barangay Health Worker Portal — Brgy. Poblacion
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {activeView === "dashboard" && <OverviewPanel />}
          {activeView === "patients" && <PatientRecordsPanel />}
          {activeView === "heatmap" && <HeatmapPanel />}
          {activeView === "programs" && <ProgramsPanel />}
          {activeView === "reports" && <ReportsPanel />}
        </main>
      </div>
    </div>
  );
}
