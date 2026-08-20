import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { Search, Plus } from "lucide-react";
import api from "../../lib/api";

export default function PatientRecordsPanel() {
  const [isViewingArchive, setIsViewingArchive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get("/api/patients").then((res) => res.data.data),
    enabled: !isViewingArchive,
  });

  const { data: archivedPatients, isLoading: archivedLoading } = useQuery({
    queryKey: ["archived-patients"],
    queryFn: () =>
      api.get("/api/patients/archived").then((res) => res.data.data),
    enabled: isViewingArchive,
  });

  const filteredPatients = useMemo(() => {
    const data = isViewingArchive ? archivedPatients : patients;
    if (!data) return [];
    return data.filter((p) =>
      (p.patient_name || `${p.first_name} ${p.last_name}`)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  }, [patients, archivedPatients, searchTerm, isViewingArchive]);

  const addPatientMutation = useMutation({
    mutationFn: (payload) => api.post("/api/patients", payload),
    onSuccess: () => {
      Swal.fire("Success", "Patient recorded successfully", "success");
      queryClient.invalidateQueries(["patients"]);
      queryClient.invalidateQueries(["bhw-stats"]);
    },
    onError: (error) => {
      Swal.fire(
        "Error",
        error.response?.data?.error || "Failed to save patient",
        "error",
      );
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (id) =>
      api.put(`/api/patients/${id}/status`, { new_status: "Cleared" }),
    onSuccess: () => {
      Swal.fire("Success", "Patient status changed to Cleared", "success");
      queryClient.invalidateQueries(["patients"]);
      queryClient.invalidateQueries(["bhw-stats"]);
    },
    onError: () => {
      Swal.fire("Error", "Could not update status", "error");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => api.put(`/api/patients/${id}/archive`),
    onSuccess: () => {
      Swal.fire("Success", "Record moved to archive", "success");
      queryClient.invalidateQueries(["patients"]);
      queryClient.invalidateQueries(["archived-patients"]);
      queryClient.invalidateQueries(["bhw-stats"]);
    },
    onError: () => {
      Swal.fire("Error", "Could not archive record", "error");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => api.put(`/api/patients/${id}/restore`),
    onSuccess: () => {
      Swal.fire("Success", "Record restored", "success");
      queryClient.invalidateQueries(["patients"]);
      queryClient.invalidateQueries(["archived-patients"]);
      queryClient.invalidateQueries(["bhw-stats"]);
    },
    onError: () => {
      Swal.fire("Error", "Could not restore record", "error");
    },
  });

  const openAddPatientModal = () => {
    Swal.fire({
      title: "New Patient Record",
      width: "600px",
      html: `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left; margin-bottom: 15px;">
            <div>
                <label style="font-size: 0.85rem; font-weight: bold; color: #64748b;">First Name *</label>
                <input id="swal-fname" class="swal2-input" style="width: 100%; margin: 5px 0 0 0; font-size: 0.95rem;" placeholder="e.g. Juan">
            </div>
            <div>
                <label style="font-size: 0.85rem; font-weight: bold; color: #64748b;">Last Name *</label>
                <input id="swal-lname" class="swal2-input" style="width: 100%; margin: 5px 0 0 0; font-size: 0.95rem;" placeholder="e.g. Dela Cruz">
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left; margin-bottom: 15px;">
            <div>
                <label style="font-size: 0.85rem; font-weight: bold; color: #64748b;">Age *</label>
                <input id="swal-age" type="number" class="swal2-input" style="width: 100%; margin: 5px 0 0 0; font-size: 0.95rem;" placeholder="e.g. 45">
            </div>
            <div>
                <label style="font-size: 0.85rem; font-weight: bold; color: #64748b;">Purok / Zone *</label>
                <select id="swal-purok" class="swal2-input" style="width: 100%; margin: 5px 0 0 0; font-size: 0.95rem;">
                    <option value="" disabled selected>Select Purok</option>
                    <option value="Purok 1">Purok 1</option>
                    <option value="Purok 2">Purok 2</option>
                    <option value="Purok 3">Purok 3</option>
                    <option value="Blumentritt">Blumentritt</option>
                </select>
            </div>
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
            <label style="font-size: 0.85rem; font-weight: bold; color: #64748b;">Diagnosed Disease / Case *</label>
            <input list="disease-options" id="swal-disease" class="swal2-input" style="width: 100%; margin: 5px 0 0 0; font-size: 0.95rem;" placeholder="Select from list or type manually...">
            <datalist id="disease-options">
                <option value="Acute Respiratory Infection (ARI)">
                <option value="Animal Bite / Wound">
                <option value="Dengue">
                <option value="Hypertension">
                <option value="Influenza">
                <option value="Pneumonia">
                <option value="Unknown Fever">
            </datalist>
        </div>
        <div style="text-align: left;">
            <label style="font-size: 0.85rem; font-weight: bold; color: #64748b;">Symptoms / Remarks (Optional)</label>
            <textarea id="swal-remarks" class="swal2-textarea" style="width: 100%; margin: 5px 0 0 0; font-size: 0.95rem; height: 80px;" placeholder="e.g. Patient has 3 days continuous fever..."></textarea>
        </div>
      `,
      confirmButtonText: "Save Record",
      confirmButtonColor: "#007bff",
      showCancelButton: true,
      preConfirm: () => {
        const fname = document.getElementById("swal-fname").value;
        const lname = document.getElementById("swal-lname").value;
        const age = document.getElementById("swal-age").value;
        const purok = document.getElementById("swal-purok").value;
        const disease = document.getElementById("swal-disease").value;
        const remarks = document.getElementById("swal-remarks").value;

        if (!fname || !lname || !age || !purok || !disease) {
          Swal.showValidationMessage("Please fill out all required fields (*)");
          return false;
        }

        return {
          first_name: fname,
          last_name: lname,
          patient_name: `${fname} ${lname}`,
          age: age,
          purok: purok,
          disease: disease,
          remarks: remarks,
          status: "Active",
        };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        addPatientMutation.mutate(result.value);
      }
    });
  };

  const handleUpdateStatus = (id) => {
    Swal.fire({
      title: "Update Patient Status",
      text: "Has this patient recovered? Mark them as Cleared?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, mark as Cleared!",
    }).then((result) => {
      if (result.isConfirmed) {
        updateStatusMutation.mutate(id);
      }
    });
  };

  const handleArchive = (id) => {
    Swal.fire({
      title: "Archive Record?",
      text: "Move this patient to the archive?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, archive it!",
    }).then((result) => {
      if (result.isConfirmed) {
        archiveMutation.mutate(id);
      }
    });
  };

  const handleRestore = (id) => {
    Swal.fire({
      title: "Restore Record?",
      text: "Put this patient back into active records?",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, restore!",
    }).then((result) => {
      if (result.isConfirmed) {
        restoreMutation.mutate(id);
      }
    });
  };

  const renderTable = () => {
    const data = filteredPatients;
    const loading = isViewingArchive ? archivedLoading : patientsLoading;

    if (loading) return <div className="text-center py-8">Loading...</div>;
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {isViewingArchive
            ? "No archived records found."
            : "No active records found."}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Purok
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Condition
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
            {data.map((patient) => {
              const statusColor =
                patient.status === "Cleared"
                  ? "text-green-600"
                  : "text-orange-600";
              const rowBg = isViewingArchive ? "bg-red-50" : "";
              return (
                <tr
                  key={patient.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${rowBg}`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={
                        isViewingArchive
                          ? "text-gray-400"
                          : "text-gray-900 font-semibold"
                      }
                    >
                      {patient.patient_name ||
                        `${patient.first_name} ${patient.last_name}`}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 ${isViewingArchive ? "text-gray-400" : ""}`}
                  >
                    {patient.purok}
                  </td>
                  <td
                    className={`px-4 py-3 ${isViewingArchive ? "text-gray-400" : ""}`}
                  >
                    {patient.disease}
                  </td>
                  <td
                    className={`px-4 py-3 font-bold ${isViewingArchive ? "text-red-500" : statusColor}`}
                  >
                    {isViewingArchive ? "Archived" : patient.status}
                  </td>
                  <td className="px-4 py-3">
                    {isViewingArchive ? (
                      <button
                        onClick={() => handleRestore(patient.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold"
                      >
                        ♻️ Restore
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(patient.id)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-semibold"
                        >
                          Update Status
                        </button>
                        <button
                          onClick={() => handleArchive(patient.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold"
                        >
                          Archive
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {isViewingArchive
          ? "Archived Patient Records"
          : "Patient Records Profiling"}
      </h2>
      <p className="text-gray-600 mb-6">
        Basic information and health records collection.
      </p>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {!isViewingArchive && (
            <button
              onClick={openAddPatientModal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition"
            >
              <Plus className="w-5 h-5" />
              Add New Resident Profile
            </button>
          )}
          <button
            onClick={() => setIsViewingArchive(!isViewingArchive)}
            className={`px-4 py-2 rounded-md font-bold transition ${
              isViewingArchive
                ? "bg-slate-900 text-white"
                : "bg-gray-500 text-white hover:bg-gray-600"
            }`}
          >
            {isViewingArchive
              ? "🔙 Back to Active Records"
              : "🗑️ View Archived Records"}
          </button>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search patient name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {renderTable()}
    </div>
  );
}
