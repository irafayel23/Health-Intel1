import { useState } from "react";
import Swal from "sweetalert2";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { FileSpreadsheet, ShieldAlert, Download } from "lucide-react";

export default function ReportsPanel() {
  const [month, setMonth] = useState("January");
  const [year, setYear] = useState("2025");
  const [purok, setPurok] = useState("All Puroks");

  const generateMonthlyReport = () => {
    const doc = new jsPDF();
    const currentBrgy = "Brgy. Poblacion";

    // Header
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("REPUBLIC OF THE PHILIPPINES", 105, 18, { align: "center" });
    doc.text("DEPARTMENT OF HEALTH - FIELD HEALTH SERVICE", 105, 25, {
      align: "center",
    });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Barangay Health Station — ${currentBrgy}`, 105, 32, {
      align: "center",
    });
    doc.setLineWidth(0.5);
    doc.line(20, 37, 190, 37);

    const title = "BARANGAY HEALTH CONSOLIDATION REPORT (BHS-M1)";
    const metaPeriod = `Reporting Period: ${month} ${year}`;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, 46);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(metaPeriod, 20, 52);
    doc.text(`Recorded By: Assigned BHW Officer`, 20, 57);

    const tableHeaders = [
      [
        "No.",
        "Service / Morbidity Indicator",
        "Target Sector",
        "Cases Recorded",
        "Status",
      ],
    ];
    const tableRows = [
      [
        "1",
        "Acute Respiratory Infections (ARI)",
        "Pediatric (0-5)",
        "14",
        "Managed",
      ],
      [
        "2",
        "Animal Bites / Rabies Screening",
        "General Pop.",
        "8",
        "Referred to RHU",
      ],
      ["3", "Fever of Unknown Origin", "All Ages", "6", "Under Observation"],
      [
        "4",
        "Hypertension Screenings",
        "Adults (40+)",
        "22",
        "Maintenance Issued",
      ],
      ["5", "Prenatal / Maternal Checkups", "Maternal", "11", "On-Track"],
      ["6", "Routine Child Immunization", "Infants (0-11m)", "19", "Completed"],
    ];

    autoTable(doc, {
      startY: 63,
      head: tableHeaders,
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [0, 102, 204] },
      styles: { font: "helvetica", fontSize: 9 },
    });

    const finalY = doc.lastAutoTable.finalY || 120;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("SUBMISSION CERTIFICATION:", 20, finalY + 15);
    doc.setFont("helvetica", "normal");
    doc.text("Prepared by:", 20, finalY + 25);
    doc.line(20, finalY + 40, 75, finalY + 40);
    doc.text("Barangay Health Worker (BHW)", 20, finalY + 45);
    doc.text("Noted and Verified by:", 125, finalY + 25);
    doc.line(125, finalY + 40, 180, finalY + 40);
    doc.text("Rural Health Midwife / RHU Officer", 125, finalY + 45);

    doc.save(`BHS_MONTHLY_REPORT_${new Date().getTime()}.pdf`);
    Swal.fire({
      icon: "success",
      title: "Report Downloaded",
      text: "Monthly summary generated successfully.",
      confirmButtonColor: "#0066cc",
    });
  };

  const generateSurveillanceReport = () => {
    const doc = new jsPDF();
    const currentBrgy = "Brgy. Poblacion";

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("REPUBLIC OF THE PHILIPPINES", 105, 18, { align: "center" });
    doc.text("DEPARTMENT OF HEALTH - FIELD HEALTH SERVICE", 105, 25, {
      align: "center",
    });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Barangay Health Station — ${currentBrgy}`, 105, 32, {
      align: "center",
    });
    doc.setLineWidth(0.5);
    doc.line(20, 37, 190, 37);

    const title = "COMMUNITY SURVEILLANCE & CLUSTER LOG";
    const metaPeriod = `Scope: ${purok} | Generated: ${new Date().toLocaleDateString()}`;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, 20, 46);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(metaPeriod, 20, 52);
    doc.text(`Recorded By: Assigned BHW Officer`, 20, 57);

    const tableHeaders = [
      [
        "Entry #",
        "Location / Purok",
        "Reported Symptoms",
        "Patients",
        "Action Taken",
      ],
    ];
    const tableRows = [
      [
        "SR-101",
        "Purok 2",
        "Suspected Dengue (Fever, Rashes)",
        "3",
        "Field Visit / Ovi-Trap Deployed",
      ],
      [
        "SR-102",
        "Purok 1",
        "Acute Gastroenteritis cluster",
        "2",
        "Water Source Sampled",
      ],
      [
        "SR-103",
        "Purok 3",
        "Hypertensive Emergency",
        "1",
        "Immediate RHU Escalation",
      ],
      [
        "SR-104",
        "Purok 2",
        "Unvaccinated Infant Flag",
        "1",
        "Scheduled for BHS Immunization",
      ],
    ];

    autoTable(doc, {
      startY: 63,
      head: tableHeaders,
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [234, 88, 12] },
      styles: { font: "helvetica", fontSize: 9 },
    });

    const finalY = doc.lastAutoTable.finalY || 120;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("SUBMISSION CERTIFICATION:", 20, finalY + 15);
    doc.setFont("helvetica", "normal");
    doc.text("Prepared by:", 20, finalY + 25);
    doc.line(20, finalY + 40, 75, finalY + 40);
    doc.text("Barangay Health Worker (BHW)", 20, finalY + 45);
    doc.text("Noted and Verified by:", 125, finalY + 25);
    doc.line(125, finalY + 40, 180, finalY + 40);
    doc.text("Rural Health Midwife / RHU Officer", 125, finalY + 45);

    doc.save(`BHS_SURVEILLANCE_REPORT_${new Date().getTime()}.pdf`);
    Swal.fire({
      icon: "success",
      title: "Report Downloaded",
      text: "Surveillance log generated successfully.",
      confirmButtonColor: "#ea580c",
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Barangay Health Station Report Generation
      </h2>
      <p className="text-gray-600 mb-6">
        Generate immutable, print-ready certified health summaries for
        submission to the Rural Health Unit (RHU/MHO).
      </p>

      <div className="grid grid-cols-2 gap-6">
        {/* Monthly Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-blue-600 p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            BHS-M1: Monthly Health Summary
          </h3>
          <p className="text-sm text-gray-600 mt-2 mb-4">
            Standardized monthly consolidation of barangay consultations, common
            morbidity cases, and vital health services.
          </p>
          <div className="flex gap-2 mb-4">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <button
            onClick={generateMonthlyReport}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition"
          >
            <Download className="w-5 h-5" />
            Generate BHS Monthly Summary (PDF)
          </button>
        </div>

        {/* Surveillance Card */}
        <div className="bg-white rounded-xl shadow-sm border-t-4 border-orange-500 p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-500" />
            Household Surveillance Registry
          </h3>
          <p className="text-sm text-gray-600 mt-2 mb-4">
            Event-based surveillance registry of monitored household clusters,
            fever alerts, and active high-risk patients.
          </p>
          <div className="mb-4">
            <select
              value={purok}
              onChange={(e) => setPurok(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="All Puroks">All Puroks / Zones</option>
              <option value="Purok 1">Purok 1</option>
              <option value="Purok 2">Purok 2</option>
              <option value="Purok 3">Purok 3</option>
            </select>
          </div>
          <button
            onClick={generateSurveillanceReport}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-md transition"
          >
            <Download className="w-5 h-5" />
            Generate Surveillance Log (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}
