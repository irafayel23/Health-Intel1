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

    // Simulated Database Data (Latitude and Longitude for Murcia Barangays)
    const brgyData = [
        // Poblacion (Center)
        { name: "Brgy. Poblacion", lat: 10.6120, lng: 123.0483, cases: 10, risk: "Low" },
        // Alegria (South-West)
        { name: "Brgy. Alegria", lat: 10.5900, lng: 123.0200, cases: 5, risk: "Low" },
        // Blumentritt (North)
        { name: "Brgy. Blumentritt", lat: 10.6300, lng: 123.0500, cases: 15, risk: "Medium" },
        // Minoyan (East / Mountainous area - Simulated Outbreak)
        { name: "Brgy. Minoyan", lat: 10.6250, lng: 123.1100, cases: 45, risk: "CRITICAL" }
    ];

    // Loop through the data and draw glowing red circles on the map
    brgyData.forEach(brgy => {
        // Calculate radius based on case count (multiply for visual scale)
        let circleRadius = brgy.cases * 40; 
        
        // Determine color based on risk
        let circleColor = brgy.risk === "CRITICAL" ? "#ef4444" : // Red for critical
                          brgy.risk === "Medium" ? "#f59e0b" :   // Orange
                          "#3b82f6";                             // Blue for low

        // Add the circle to the map
        const circle = L.circle([brgy.lat, brgy.lng], {
            color: circleColor,
            fillColor: circleColor,
            fillOpacity: 0.5,
            radius: circleRadius // Radius in meters
        }).addTo(map);

        // Add a click popup to the circle
        circle.bindPopup(`
            <div style="text-align: center;">
                <h4 style="margin: 0; color: #0f172a;">${brgy.name}</h4>
                <p style="margin: 5px 0; color: #ef4444; font-weight: bold;">${brgy.cases} Active Cases</p>
                <span style="font-size: 0.8rem; color: #64748b;">Status: ${brgy.risk}</span>
            </div>
        `);
    });
    
    // Fix for Leaflet rendering inside a hidden div (Very important for tabs!)
    // When the user clicks the "Heatmap Cases" button, we tell the map to recalculate its size
    document.querySelector('[data-target="view-heatmap"]').addEventListener('click', function() {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    });
}