import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { PlusCircle } from "lucide-react";
import api from "../../lib/api";

export default function DiseaseRegistryPanel() {
  const [subView, setSubView] = useState("active"); // 'active' | 'archived'
  const [modalOpen, setModalOpen] = useState(false);
  const [newDisease, setNewDisease] = useState({
    name: "",
    category: "Morbidity",
    classification: "Standard",
  });
  const queryClient = useQueryClient();

  // Fetch active diseases
  const { data: diseases, isLoading: diseasesLoading } = useQuery({
    queryKey: ["diseases"],
    queryFn: () => api.get("/api/diseases").then((res) => res.data.data),
  });

  // Fetch archived diseases
  const { data: archivedDiseases, isLoading: archivedLoading } = useQuery({
    queryKey: ["archived-diseases"],
    queryFn: () =>
      api.get("/api/diseases/archived").then((res) => res.data.data),
  });

  // Add disease mutation
  const addDiseaseMutation = useMutation({
    mutationFn: (payload) => api.post("/api/diseases", payload),
    onSuccess: () => {
      Swal.fire("Success", "Disease added to registry", "success");
      queryClient.invalidateQueries(["diseases"]);
      setModalOpen(false);
      setNewDisease({
        name: "",
        category: "Morbidity",
        classification: "Standard",
      });
    },
    onError: (error) => {
      Swal.fire(
        "Error",
        error.response?.data?.error || "Failed to add disease",
        "error",
      );
    },
  });

  // Archive disease mutation
  const archiveDiseaseMutation = useMutation({
    mutationFn: (id) => api.put(`/api/diseases/${id}/archive`),
    onSuccess: () => {
      Swal.fire("Success", "Disease archived", "success");
      queryClient.invalidateQueries(["diseases"]);
      queryClient.invalidateQueries(["archived-diseases"]);
    },
  });

  // Restore disease mutation
  const restoreDiseaseMutation = useMutation({
    mutationFn: (id) => api.put(`/api/diseases/${id}/restore`),
    onSuccess: () => {
      Swal.fire("Success", "Disease restored", "success");
      queryClient.invalidateQueries(["diseases"]);
      queryClient.invalidateQueries(["archived-diseases"]);
    },
  });

  const handleSaveDisease = () => {
    if (!newDisease.name) {
      Swal.fire("Warning", "Disease name is required", "warning");
      return;
    }
    addDiseaseMutation.mutate(newDisease);
  };

  const renderDiseaseTable = (data, isArchived = false) => {
    if (diseasesLoading || archivedLoading)
      return <div className="text-center py-8">Loading...</div>;
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {isArchived ? "No archived diseases" : "No active diseases"}
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Disease Name
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Category
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Classification
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
            {data.map((d) => {
              const classStyle =
                d.classification === "High Risk"
                  ? "bg-red-100 text-red-800"
                  : "bg-sky-100 text-sky-800";
              return (
                <tr
                  key={d.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {d.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${classStyle}`}
                    >
                      {d.classification}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isArchived ? (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">
                        Archived
                      </span>
                    ) : (
                      <span className="text-green-600 font-bold">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isArchived ? (
                      <button
                        onClick={() => restoreDiseaseMutation.mutate(d.id)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm font-semibold"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => archiveDiseaseMutation.mutate(d.id)}
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Master Disease Registry
          </h2>
          <p className="text-gray-600">
            Manage the standardized list of diseases stored in the database.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition"
        >
          <PlusCircle className="w-5 h-5" />
          Add New Disease
        </button>
      </div>

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
            Active Registry
          </button>
          <button
            onClick={() => setSubView("archived")}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              subView === "archived"
                ? "bg-sky-100 text-sky-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Archived Registry
          </button>
        </div>
        {subView === "active"
          ? renderDiseaseTable(diseases)
          : renderDiseaseTable(archivedDiseases, true)}
      </div>

      {/* Add Disease Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Add to Registry
            </h3>
            <input
              type="text"
              placeholder="e.g. Typhoid Fever"
              value={newDisease.name}
              onChange={(e) =>
                setNewDisease({ ...newDisease, name: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={newDisease.category}
              onChange={(e) =>
                setNewDisease({ ...newDisease, category: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Morbidity">Morbidity (Sickness)</option>
              <option value="Mortality">Mortality (Death)</option>
            </select>
            <select
              value={newDisease.classification}
              onChange={(e) =>
                setNewDisease({ ...newDisease, classification: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Standard">Standard Case</option>
              <option value="High Risk">High Risk / Alert</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleSaveDisease}
                disabled={addDiseaseMutation.isPending}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition"
              >
                {addDiseaseMutation.isPending
                  ? "Saving..."
                  : "Save to Database"}
              </button>
              <button
                onClick={() => setModalOpen(false)}
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
