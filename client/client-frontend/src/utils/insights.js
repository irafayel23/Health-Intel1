// src/utils/insights.js

export function generateInsights(data, category, age, year) {
  if (data.length === 0) {
    return {
      insightHTML:
        "No data available for these specific demographic parameters.",
      recommendation: "N/A",
    };
  }

  const sortedData = [...data].sort((a, b) => b.cases - a.cases);
  const topDisease = sortedData[0];
  const totalCases = sortedData.reduce((sum, item) => sum + item.cases, 0);
  const percentage = ((topDisease.cases / totalCases) * 100).toFixed(1);

  let insightHTML = "";
  let recommendation = "";

  if (category === "morbidity") {
    insightHTML = `
      <ul style="padding-left: 18px; margin-top: 0; list-style-type: none;">
        <li style="margin-bottom: 15px; position: relative;">
          <span style="position: absolute; left: -18px; color: #3b82f6; font-weight: bold;">•</span>
          <strong>Dominant Category:</strong> The leading morbidity factor for this demographic subset is <span style="color:#0284c7; font-weight:700;">${topDisease.disease}</span>, which accounts for approximately <strong>${percentage}%</strong> of the mapped records.
        </li>
        <li style="margin-bottom: 15px; position: relative;">
          <span style="position: absolute; left: -18px; color: #3b82f6; font-weight: bold;">•</span>
          <strong>Volume Overview:</strong> A total of ${topDisease.cases.toLocaleString()} instances were recorded. High concentration in a single category typically indicates strong environmental or transmissible factors.
        </li>`;

    if (
      topDisease.disease.includes("Bite") ||
      topDisease.disease.includes("Wound")
    ) {
      insightHTML += `
        <li style="position: relative;">
          <span style="position: absolute; left: -18px; color: #3b82f6; font-weight: bold;">•</span>
          <strong>Contextual Note:</strong> Wounds and animal bites represent a persistent external/environmental threat rather than a contagious community outbreak.
        </li>`;
      recommendation =
        "Allocate resources towards localized Rabies Awareness drives and ensure optimal stocking of post-exposure prophylaxis (PEP) at Rural Health Units.";
    } else if (
      topDisease.disease.includes("Resp") ||
      topDisease.disease.includes("Cough") ||
      topDisease.disease.includes("Influenza")
    ) {
      insightHTML += `
        <li style="position: relative;">
          <span style="position: absolute; left: -18px; color: #3b82f6; font-weight: bold;">•</span>
          <strong>Contextual Note:</strong> Respiratory tract infections demonstrate rapid community transmission, likely aggravated by seasonal weather changes or poor ventilation.
        </li>`;
      recommendation =
        "Activate community-level respiratory protocols. Maximize BHW deployment for symptom screening and distribute immune-boosting supplements to vulnerable sectors.";
    } else {
      recommendation =
        "Conduct immediate cluster mapping via the GIS Heatmap to trace the specific environmental or behavioral root causes of this disease spike.";
    }
    insightHTML += `</ul>`;
  } else {
    // Mortality
    insightHTML = `
      <ul style="padding-left: 18px; margin-top: 0; list-style-type: none;">
        <li style="margin-bottom: 15px; position: relative;">
          <span style="position: absolute; left: -18px; color: #ef4444; font-weight: bold;">•</span>
          <strong>Primary Mortality Driver:</strong> <span style="color:#ef4444; font-weight:700;">${topDisease.disease}</span> ranks as the highest cause of mortality, with ${topDisease.cases} recorded fatalities in this subset.
        </li>`;

    if (topDisease.disease.includes("Undetermined")) {
      insightHTML += `
        <li style="position: relative;">
          <span style="position: absolute; left: -18px; color: #ef4444; font-weight: bold;">•</span>
          <strong>Data Discrepancy:</strong> The prevalence of "Undetermined Causes" indicates a significant gap in post-mortem diagnostics or late medical intervention.
        </li>`;
      recommendation =
        "Enforce stricter guidelines for grassroots health tracking. Early intervention by BHWs is required to minimize deaths occurring outside official medical facilities.";
    } else if (
      topDisease.disease.includes("Hypertension") ||
      topDisease.disease.includes("Heart") ||
      topDisease.disease.includes("Cardio")
    ) {
      insightHTML += `
        <li style="position: relative;">
          <span style="position: absolute; left: -18px; color: #ef4444; font-weight: bold;">•</span>
          <strong>Contextual Note:</strong> Non-communicable diseases (NCDs) linked to diet and lifestyle remain the most fatal threat to this demographic.
        </li>`;
      recommendation =
        "Implement municipal-wide 'Healthy Lifestyle' programs and mandate routine blood pressure and glucose screenings at all barangay health centers.";
    } else if (
      topDisease.disease.includes("Fetal") ||
      topDisease.disease.includes("Prematurity")
    ) {
      insightHTML += `
        <li style="position: relative;">
          <span style="position: absolute; left: -18px; color: #ef4444; font-weight: bold;">•</span>
          <strong>Contextual Note:</strong> High rates of neonatal and fetal complications highlight critical risks in local maternal health management.
        </li>`;
      recommendation =
        "Intensify maternal care monitoring. Require weekly check-ins for high-risk pregnancies and improve rapid transport to Lying-in clinics.";
    } else {
      recommendation =
        "Review current clinical intervention strategies, medicine stockpiles, and RHU response times for this specific critical condition.";
    }
    insightHTML += `</ul>`;
  }

  return { insightHTML, recommendation };
}
