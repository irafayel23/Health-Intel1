import { Users, MapPin, Bell } from "lucide-react";

export default function ExecutiveDashboardPanel() {
  const stats = [
    {
      title: "Total Cover",
      value: "92,241",
      icon: Users,
      color: "text-sky-600",
      bg: "bg-sky-100",
    },
    {
      title: "Brgys Monitored",
      value: "23 / 23",
      icon: MapPin,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      title: "System Alerts",
      value: "3",
      icon: Bell,
      color: "text-orange-600",
      bg: "bg-orange-100",
      valueColor: "text-red-500",
    },
  ];

  const programData = [
    {
      label: "Immunization",
      value: "87%",
      sub: "On Target",
      bg: "bg-green-50",
      text: "text-green-600",
    },
    {
      label: "Maternal Care",
      value: "92%",
      sub: "Exceeding",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    {
      label: "Senior Care",
      value: "65%",
      sub: "Needs Work",
      bg: "bg-orange-50",
      text: "text-orange-600",
    },
    {
      label: "Nutrition",
      value: "--",
      sub: "Pending",
      bg: "bg-gray-50",
      text: "text-gray-500",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Executive Dashboard</h2>
      <p className="text-gray-600 mb-6">
        High-level public health summaries. Patient data anonymized.
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p
                className={`text-2xl font-bold mt-1 ${stat.valueColor || "text-gray-900"}`}
              >
                {stat.value}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Program Status Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Program Status Breakdown
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {programData.map((program) => (
            <div
              key={program.label}
              className={`${program.bg} rounded-lg p-4 text-center`}
            >
              <div className={`text-2xl font-bold ${program.text}`}>
                {program.value}
              </div>
              <div className="text-sm font-medium text-gray-700">
                {program.label}
              </div>
              <div className="text-xs text-gray-500">{program.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
