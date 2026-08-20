import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Download } from "lucide-react";

export default function PolicyReportsPanel() {
  const generateMayorsAbstract = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("MUNICIPALITY OF MURCIA", 105, 20, { align: "center" });
    doc.text("MAYOR'S EXECUTIVE HEALTH ABSTRACT", 105, 30, { align: "center" });
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Date: " + new Date().toLocaleDateString(), 20, 45);
    doc.text("Prepared by: Municipal Health Office (MHO)", 20, 52);

    const summary = [
      "Total Population: 92,241",
      "Barangays Monitored: 23 / 23",
      "Active Cases: 42",
      "Recovered: 38",
      "High Risk Cases: 4",
      "System Alerts: 3",
      "",
      "Key Findings:",
      "- Dengue cases show an upward trend in Poblacion and Minoyan.",
      "- Immunization coverage is at 87%, slightly below target.",
      "- Senior care programs require additional resources.",
      "- Maternal care is exceeding targets at 92%.",
    ];

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    let yPos = 60;
    summary.forEach((line) => {
      doc.text(line, 20, yPos);
      yPos += 7;
    });

    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      "This document is a computer-generated summary and does not contain patient-identifiable information.",
      20,
      280,
    );

    doc.save(`Mayors_Abstract_${new Date().getTime()}.pdf`);
    Swal.fire({
      icon: "success",
      title: "PDF Generated",
      text: "Mayor's Abstract has been downloaded.",
      confirmButtonColor: "#6366f1",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Policy & Planning Documents
      </h2>
      <p className="text-gray-600 mb-6">
        Executive summaries for LGU session planning.
      </p>

      <button
        onClick={generateMayorsAbstract}
        className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg transition"
      >
        <Download className="w-5 h-5" />
        Download Mayor's Abstract (.pdf)
      </button>
    </div>
  );
}
