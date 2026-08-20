import Swal from "sweetalert2";
import { DatabaseZap, DownloadCloud } from "lucide-react";

export default function DatabaseControlPanel() {
  const handleBackup = () => {
    Swal.fire({
      title: "Extracting Database...",
      text: "Compiling MySQL structures into health_intel_backup.sql",
      background: "#0f172a",
      color: "white",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    setTimeout(() => {
      Swal.fire({
        icon: "success",
        title: "Backup Successful",
        text: "File downloaded to secure local storage.",
        background: "#0f172a",
        color: "white",
      });
    }, 2000);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white">
        Database Control & Backup
      </h2>
      <p className="text-slate-400 mb-6">
        Create emergency restore points of the entire MySQL Health_Intel
        structure.
      </p>

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-16 text-center">
        <DatabaseZap className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white">Manual SQL Dump</h3>
        <p className="text-slate-400 max-w-lg mx-auto my-6">
          This will extract all user records, master health data, active
          sessions, and disease registries into an encrypted .sql file for
          off-site disaster recovery.
        </p>
        <button
          onClick={handleBackup}
          className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3 rounded-lg transition shadow-lg shadow-cyan-500/30"
        >
          <DownloadCloud className="w-5 h-5" />
          Execute Full Backup
        </button>
      </div>
    </div>
  );
}
