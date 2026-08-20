import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { Search } from "lucide-react";
import api from "../../lib/api";

export default function MasterRecordsPanel() {
  const [subView, setSubView] = useState("active"); // 'active' | 'archived'
  const [search, setSearch] = useState("");
  const [brgyFilter, setBrgyFilter] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const queryClient = useQueryClient();

  // Fetch active patients
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get("/api/patients").then((res) => res.data.data),
  });

  // Fetch archived patients
  const { data: archivedPatients, isLoading: archivedLoading } = useQuery({
    queryKey: ["archived-patients"],
    queryFn: () =>
      api.get("/api/patients/archived").then((res) => res.data.data),
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id) => api.put(`/api/patients/${id}/archive`),
    onSuccess: () => {
      Swal.fire("Success", "Patient archived", "success");
      queryClient.invalidateQueries(["patients"]);
      queryClient.invalidateQueries(["archived-patients"]);
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (id) => api.put(`/api/patients/${id}/restore`),
    onSuccess: () => {
      Swal.fire("Success", "Patient restored", "success");
      queryClient.invalidateQueries(["patients"]);
      queryClient.invalidateQueries(["archived-patients"]);
    },
  });

  // Filter patients based on search and filters
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    return patients.filter((p) => {
      const fullName = (
        p.patient_name || `${p.first_name} ${p.last_name}`
      ).toLowerCase();
      const sysId = `#rec-${p.id}`.toLowerCase();
      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        sysId.includes(search.toLowerCase()) ||
        search.replace("#", "") === p.id.toString();
      const matchesBrgy = brgyFilter === "" || p.purok === brgyFilter;
      const matchesDisease =
        diseaseFilter === "" ||
        (p.disease || "").toLowerCase().includes(diseaseFilter.toLowerCase());
      const currentStatus = (p.status || "active").toLowerCase();
      const matchesStatus =
        statusFilter === "" || currentStatus === statusFilter.toLowerCase();
      return matchesSearch && matchesBrgy && matchesDisease && matchesStatus;
    });
  }, [patients, search, brgyFilter, diseaseFilter, statusFilter]);

  const renderPatientTable = (data, isArchived = false) => {
    if (patientsLoading || archivedLoading)
      return <div className="text-center py-8">Loading...</div>;
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {isArchived ? "No archived records" : "No active records"}
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
                Patient Name
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Age
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Disease
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Barangay
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => {
              const statusColor =
                (p.status || "Active").toLowerCase() === "active"
                  ? "text-orange-600"
                  : "text-green-600";
              const diseaseColor = (p.disease || "")
                .toLowerCase()
                .includes("bite")
                ? "text-red-600 font-bold"
                : "text-gray-700";
              return (
                <tr
                  key={p.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-gray-600">#REC-{p.id}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {p.patient_name || `${p.first_name} ${p.last_name}`}
                  </td>
                  <td className="px-4 py-3">{p.age || "N/A"}</td>
                  <td className={`px-4 py-3 ${diseaseColor}`}>
                    {p.disease || "Unknown"}
                  </td>
                  <td className="px-4 py-3">{p.purok}</td>
                  <td className={`px-4 py-3 font-bold ${statusColor}`}>
                    {p.status || "Active"}
                  </td>
                  <td className="px-4 py-3">
                    {isArchived ? (
                      <button
                        onClick={() => restoreMutation.mutate(p.id)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm font-semibold"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => archiveMutation.mutate(p.id)}
                        className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1 rounded text-sm font-semibold transition"
                      >
                        Archive
                      </button>
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
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Master Record Database
      </h2>
      <p className="text-gray-600 mb-6">
        Centralized oversight of all patient encodings by BHWs.
      </p>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-3">
          <button
            onClick={() => setSubView("active")}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              subView === "active"
                ? "bg-sky-100 text-sky-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Active Patient Records
          </button>
          <button
            onClick={() => setSubView("archived")}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              subView === "archived"
                ? "bg-sky-100 text-sky-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Archived Records
          </button>
        </div>

        {subView === "active" && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search name or System ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <select
                value={brgyFilter}
                onChange={(e) => setBrgyFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md font-semibold text-gray-700"
              >
                <option value="">All Barangays</option>
                <option value="Blumentritt">Blumentritt</option>
                <option value="Poblacion">Poblacion</option>
                <option value="San Jose">San Jose</option>
              </select>
              <select
                value={diseaseFilter}
                onChange={(e) => setDiseaseFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md font-semibold text-gray-700"
              >
                <option value="">All Diseases</option>
                <option value="animal bite">Animal Bite / Wound</option>
                <option value="dengue">Dengue</option>
                <option value="pneumonia">Pneumonia</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md font-semibold text-gray-700"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Cases</option>
                <option value="recovered">Recovered</option>
              </select>
            </div>
            {renderPatientTable(filteredPatients)}
          </>
        )}

        {subView === "archived" && renderPatientTable(archivedPatients, true)}
      </div>
    </div>
  );
}
