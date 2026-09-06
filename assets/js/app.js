// assets/js/app.js

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') { lucide.createIcons(); }

    // Navigation Logic
    const navBtns = document.querySelectorAll('.nav-item[data-target]');
    const sections = document.querySelectorAll('.view-section');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sections.forEach(s => s.classList.add('hidden'));
            const target = document.getElementById(btn.getAttribute('data-target'));
            if (target) target.classList.remove('hidden');
        });
    });

    // --- CHART LOGIC WITH NULL CHECKS ---
    // This prevents errors if a chart is not on the current page.

    const bhwCanvas = document.getElementById("bhwChart");
    if (bhwCanvas && typeof Chart !== 'undefined') {
        new Chart(bhwCanvas.getContext("2d"), {
            type: "line",
            data: { labels: ["Jan", "Feb", "Mar", "Apr", "May"], datasets: [{ label: "Cases", data: [15, 28, 22, 35, 45], borderColor: "#0ea5e9", tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const mhoBarCanvas = document.getElementById("mhoBarChart");
    if (mhoBarCanvas && typeof Chart !== 'undefined') {
        new Chart(mhoBarCanvas.getContext("2d"), {
            type: "bar",
            data: { labels: ["Brgy A", "Brgy B", "Brgy C", "Brgy D"], datasets: [{ label: "Cases", data: [140, 105, 88, 70], backgroundColor: "#10b981" }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const munResourceCanvas = document.getElementById("munResourceChart");
    if (munResourceCanvas && typeof Chart !== 'undefined') {
        new Chart(munResourceCanvas.getContext("2d"), {
            type: "doughnut",
            data: { labels: ["Meds", "Staff", "Logistics"], datasets: [{ data: [45, 30, 25], backgroundColor: ["#6366f1", "#10b981", "#f59e0b"] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
});
// ==========================================
// 1. REAL GIS HEATMAP USING LEAFLET.JS
// ==========================================

// Check if the map container exists before loading
const mapContainer = document.getElementById("murciaMap");

if (mapContainer) {
    // Initialize the map and set the view perfectly over Murcia, Negros Occidental
    // Coordinates: Latitude 10.6120, Longitude 123.0483, Zoom Level 12
    const map = L.map('murciaMap').setView([10.6120, 123.0483], 12);

    // Load the real map tiles from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors | HEALTH-INTEL GIS'
    }).addTo(map);

    // Base coordinates for the 7 target barangays in Murcia
    const brgyCoords = {
        "Blumentritt": { lat: 10.6300, lng: 123.0500 },
        "Salvacion": { lat: 10.6100, lng: 123.0800 },
        "Minoyan": { lat: 10.6250, lng: 123.1100 },
        "Caliban": { lat: 10.5850, lng: 123.0500 },
        "Cansilayan": { lat: 10.6400, lng: 123.0600 },
        "Alegria": { lat: 10.5900, lng: 123.0200 },
        "Sta. Rosa": { lat: 10.6500, lng: 123.0800 }
    };

    let mapCircles = [];

    function parseCSVRow(row) {
        let result = [];
        let cur = '';
        let inQuotes = false;
        for(let i=0; i<row.length; i++) {
            if(row[i] === '"') inQuotes = !inQuotes;
            else if(row[i] === ',' && !inQuotes) {
                result.push(cur);
                cur = '';
            } else {
                cur += row[i];
            }
        }
        result.push(cur);
        return result;
    }

    // Fetch live cases from CSV
    fetch("datasets/health_data.csv")
      .then(response => response.text())
      .then(csvText => {
          const rows = csvText.split('\n').filter(row => row.trim() !== '');
          let casesPerBrgy = {
              "Blumentritt": 0, "Salvacion": 0, "Minoyan": 0, 
              "Caliban": 0, "Cansilayan": 0, "Alegria": 0, "Sta. Rosa": 0
          };
          
          for(let i = 1; i < rows.length; i++) {
              const cols = parseCSVRow(rows[i]);
              if (cols.length >= 4) {
                  const brgy = cols[1].trim();
                  let cases = parseInt(cols[cols.length - 1].trim()); // cases is always the last column
                  if (isNaN(cases)) cases = 0;
                  
                  if (casesPerBrgy[brgy] !== undefined) {
                      casesPerBrgy[brgy] += cases;
                  }
              }
          }

          for (const [brgyName, cases] of Object.entries(casesPerBrgy)) {
              let risk = cases >= 15 ? "CRITICAL" : (cases >= 5 ? "Medium" : "Low");
              let circleColor = risk === "CRITICAL" ? "#ef4444" : 
                                risk === "Medium" ? "#f59e0b" : 
                                "#3b82f6";
              
              // Base radius plus scaling
              let circleRadius = 300 + (cases * 30); 

              const circle = L.circle([brgyCoords[brgyName].lat, brgyCoords[brgyName].lng], {
                  color: circleColor,
                  fillColor: circleColor,
                  fillOpacity: 0.5,
                  radius: circleRadius
              }).addTo(map);

              circle.bindPopup(`
                  <div style="text-align: center;">
                      <h4 style="margin: 0; color: #0f172a;">Brgy. ${brgyName}</h4>
                      <p style="margin: 5px 0; color: ${circleColor}; font-weight: bold;">${cases} Active Cases</p>
                      <span style="font-size: 0.8rem; color: #64748b;">Status: ${risk}</span>
                  </div>
              `);
              
              mapCircles.push(circle);
          }
      })
      .catch(error => console.error("Error loading heatmap data:", error));
    
    // Fix for Leaflet rendering inside a hidden div (Very important for tabs!)
    // When the user clicks the "Heatmap Cases" button, we tell the map to recalculate its size
    document.querySelector('[data-target="view-heatmap"]').addEventListener('click', function() {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    });
}