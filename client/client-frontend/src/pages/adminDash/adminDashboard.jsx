import { useState } from "react";
import { Server, Users, Database, ClipboardList, LogOut } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";

// Panel components
import UserManagementPanel from "./UserManagementPanel";
import MasterRecordsPanel from "./MasterRecordsPanel";
import DiseaseRegistryPanel from "./DiseaseRegistryPanel";

export default function AdminDashboardPage() {
  const [activeModule, setActiveModule] = useState("iam");
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { id: "iam", label: "User Management", icon: Users },
    { id: "data", label: "Master Records", icon: Database },
    { id: "diseases", label: "Disease Registry", icon: ClipboardList },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <Server className="w-7 h-7 text-sky-400" />
          <h2 className="text-lg font-bold tracking-wider">ADMIN DASHBOARD</h2>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`flex items-center gap-3 px-6 py-3 text-left font-bold transition ${
                activeModule === item.id
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
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900">
            MHO & HR Control Center
          </h1>
          <div className="text-sm text-gray-600">
            Logged in as:{" "}
            <span className="font-bold text-sky-600">System Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {activeModule === "iam" && <UserManagementPanel />}
          {activeModule === "data" && <MasterRecordsPanel />}
          {activeModule === "diseases" && <DiseaseRegistryPanel />}
        </main>
      </div>
    </div>
  );
}
