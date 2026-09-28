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
            if (target) {
                target.classList.remove('hidden');
                target.parentElement.scrollTop = 0;
            }
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
