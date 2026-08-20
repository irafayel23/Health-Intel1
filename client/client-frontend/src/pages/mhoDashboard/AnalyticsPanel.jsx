import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Activity, ShieldCheck, AlertCircle } from "lucide-react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import api from "../../lib/api";
import { healthDatabase } from "../../utils/healthDatabase";
import { generateInsights } from "../../utils/insights";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

export default function AnalyticsPanel() {
  // State for filters
  const [year, setYear] = useState("2025");
  const [barangay, setBarangay] = useState("all");
  const [category, setCategory] = useState("morbidity");
  const [age, setAge] = useState("all");
  const [sex, setSex] = useState("both");

  // Fetch live MHO stats
  const { data: stats } = useQuery({
    queryKey: ["mho-stats"],
    queryFn: () => api.get("/api/mho-stats").then((res) => res.data.data),
    refetchInterval: 5000,
  });

  // Compute processed data for dynamic chart
  const processedData = useMemo(() => {
    const rawData = healthDatabase[year]?.[category]?.[age] || [];
    let data = rawData
      .map((item) => {
        let calculated = item.cases;
        if (barangay === "Blumentritt") calculated *= 0.35;
        else if (barangay === "Poblacion") calculated *= 0.3;
        else if (barangay === "San Jose") calculated *= 0.2;
        else if (barangay === "Talabas") calculated *= 0.15;
        if (sex === "male") calculated *= 0.504;
        else if (sex === "female") calculated *= 0.496;
        return { disease: item.disease, cases: Math.round(calculated) };
      })
      .filter((d) => d.cases > 0);
    return data;
  }, [year, barangay, category, age, sex]);

  // Generate insights
  const { insightHTML, recommendation } = useMemo(
    () => generateInsights(processedData, category, age, year),
    [processedData, category, age, year],
  );

  // Dynamic chart data
  const dynamicChartData = {
    labels: processedData.map((d) => d.disease),
    datasets: [
      {
        label: "Cases Recorded",
        data: processedData.map((d) => d.cases),
        backgroundColor:
          category === "morbidity"
            ? "rgba(59, 130, 246, 0.7)"
            : "rgba(239, 68, 68, 0.7)",
        borderRadius: 6,
      },
    ],
  };

  const dynamicChartOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleFont: { size: 14 },
        bodyFont: { size: 13, weight: "bold" },
        padding: 12,
      },
    },
    scales: {
      x: { beginAtZero: true, grid: { borderDash: [4, 4], color: "#e2e8f0" } },
      y: { grid: { display: false } },
    },
  };

  // YoY morbidity chart
  const yoyData = {
    labels: [
      "Wounds & Animal Bites",
      "Respiratory (ARI/URTI)",
      "Unknown Fever",
      "Hypertension",
    ],
    datasets: [
      {
        label: "CY 2024",
        data: [2519, 2037, 1396, 110],
        backgroundColor: "rgba(148, 163, 184, 0.7)",
        borderRadius: 4,
      },
      {
        label: "CY 2025",
        data: [3674, 1039, 490, 320],
        backgroundColor: "rgba(16, 185, 129, 0.9)",
        borderRadius: 4,
      },
    ],
  };

  const yoyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          afterBody: function (context) {
            if (context.length === 2) {
              const val2024 = context[0].raw;
              const val2025 = context[1].raw;
              const diff = val2025 - val2024;
              const perc = ((diff / val2024) * 100).toFixed(1);
              if (diff > 0)
                return `\n⚠️ Alert: Increased by ${diff} cases (+${perc}%)`;
              else
                return `\n✅ Improved: Dropped by ${Math.abs(diff)} cases (${perc}%)`;
            }
            return "";
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
      x: { grid: { display: false } },
    },
  };

  // Mortality doughnut
  const mortalityData = {
    labels: [
      "Undetermined Cause",
      "Hypertension",
      "Tuberculosis",
      "Diabetes",
      "Kidney Disease",
    ],
    datasets: [
      {
        data: [74, 66, 28, 22, 20],
        backgroundColor: [
          "#64748b",
          "#ef4444",
          "#f59e0b",
          "#3b82f6",
          "#8b5cf6",
        ],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const mortalityOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 12, font: { size: 11 } },
      },
    },
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Municipal Analytics</h2>
      <p className="text-gray-600 mb-6">
        Interactive filtering and automated insights of historical FHSIS health
        data.
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Pop.</p>
            <p className="text-2xl font-bold text-gray-900">92,241</p>
          </div>
          <div className="p-2 rounded-lg bg-sky-100">
            <Users className="w-6 h-6 text-sky-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Cases</p>
            <p className="text-2xl font-bold text-orange-600">
              {stats?.active ?? "..."}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-orange-100">
            <Activity className="w-6 h-6 text-orange-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Recovered</p>
            <p className="text-2xl font-bold text-green-600">
              {stats?.recovered ?? "..."}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-green-100">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">High Risk Cases</p>
            <p className="text-2xl font-bold text-red-600">
              {stats?.high_risk ?? "..."}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-red-100">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Epidemiological Health Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-sky-500" />
          Epidemiological Health Profile
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Cross-reference demographic parameters to generate automated
          descriptive summaries of past health events.
        </p>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="flex-1 min-w-[100px] px-3 py-2 border border-gray-300 rounded-md font-semibold text-gray-800 bg-white"
          >
            <option value="2025">CY 2025</option>
            <option value="2024">CY 2024</option>
            <option value="2023">CY 2023</option>
          </select>
          <select
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 bg-white"
          >
            <option value="all">All Barangays</option>
            <option value="Blumentritt">Blumentritt</option>
            <option value="Poblacion">Poblacion</option>
            <option value="San Jose">San Jose</option>
            <option value="Talabas">Talabas</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 bg-white"
          >
            <option value="morbidity">Cases (Morbidity)</option>
            <option value="mortality">Deaths (Mortality)</option>
          </select>
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 bg-white"
          >
            <option value="all">All Ages</option>
            <option value="under5">Under 5 Years</option>
            <option value="infant">Infant (0-11 Months)</option>
          </select>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 rounded-md font-semibold text-gray-700 bg-white"
          >
            <option value="both">Both Sexes</option>
            <option value="male">Male Only</option>
            <option value="female">Female Only</option>
          </select>
        </div>

        {/* Chart and Insights */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-[420px] bg-white border border-gray-100 rounded-lg p-4">
            <Bar data={dynamicChartData} options={dynamicChartOptions} />
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 flex flex-col">
            <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
              <span className="bg-sky-100 p-1 rounded-md">
                <Activity className="w-5 h-5 text-sky-600" />
              </span>
              Automated Descriptive Analysis
            </h4>
            <div
              className="text-sm text-gray-700 leading-relaxed flex-1"
              dangerouslySetInnerHTML={{ __html: insightHTML }}
            />
            <div className="mt-4 pt-3 border-t border-dashed border-gray-300 bg-green-50 rounded-lg p-4">
              <span className="font-bold text-green-700 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4" />
                Suggested MHO Action:
              </span>
              <p className="text-xs text-green-700 mt-2 leading-relaxed">
                {recommendation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* YoY Morbidity and Mortality */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-sky-500" />
            Year-Over-Year Morbidity (2024 vs 2025)
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Comparative analysis of leading health burdens across all barangays.
          </p>
          <div className="h-72">
            <Bar data={yoyData} options={yoyOptions} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-sky-500" />
            Leading Mortality (2025)
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Top causes of death requiring system intervention.
          </p>
          <div className="h-72">
            <Doughnut data={mortalityData} options={mortalityOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
