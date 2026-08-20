import { useQuery } from "@tanstack/react-query";
import { Users, Activity, ShieldCheck, AlertTriangle } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import api from "../../lib/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export default function OverviewPanel() {
  // Fetch stats from API
  const { data: stats, isLoading } = useQuery({
    queryKey: ["bhw-stats"],
    queryFn: () => api.get("/api/bhw-stats").then((res) => res.data),
  });

  const chartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      {
        label: "Monthly Cases",
        data: [15, 28, 22, 35, 45],
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14, 165, 233, 0.1)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#0ea5e9",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: "#f1f5f9" } },
      x: { grid: { display: false } },
    },
  };

  const statCards = [
    {
      title: "Total Patients",
      value: stats?.total ?? "Loading...",
      icon: Users,
      color: "text-sky-600",
      bg: "bg-sky-100",
    },
    {
      title: "Active Cases",
      value: stats?.active ?? "...",
      icon: Activity,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
    {
      title: "Cleared Cases",
      value: stats?.cleared ?? "...",
      icon: ShieldCheck,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      title: "High Risk",
      value: "12", // Hardcoded in original
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
      <p className="text-gray-600 mb-6">
        Real-time insights for Barangay Poblacion.
      </p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {card.value}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-sky-500" />
          Disease Status Breakdown
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-100 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">1,863</div>
            <div className="text-sm font-medium text-gray-600">Cleared</div>
            <div className="text-xs text-gray-500">97% of population</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">22</div>
            <div className="text-sm font-medium text-gray-700">Mild Cases</div>
            <div className="text-xs text-gray-500">Recovering</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">11</div>
            <div className="text-sm font-medium text-gray-700">Monitored</div>
            <div className="text-xs text-gray-500">Weekly checkup</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">12</div>
            <div className="text-sm font-medium text-gray-700">High Risk</div>
            <div className="text-xs text-gray-500">Requires attention</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Disease Trend</h3>
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
