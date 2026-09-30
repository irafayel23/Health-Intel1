// MHO sidebar and theme controls.
// Classic script: load through mho.html; cross-feature functions share its page scope.
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const icon = document.getElementById("sidebar-icon");
    const text = document.getElementById("sidebar-text");
    const labels = document.querySelectorAll(".sidebar-label");

    if (sidebar.classList.contains("w-64")) {
        sidebar.classList.replace("w-64", "w-20");
        text.classList.add("hidden");
        labels.forEach(l => l.classList.add("hidden"));
        icon.setAttribute("data-lucide", "panel-left-open");
    } else {
        sidebar.classList.replace("w-20", "w-64");
        text.classList.remove("hidden");
        labels.forEach(l => l.classList.remove("hidden"));
        icon.setAttribute("data-lucide", "panel-left-close");
    }
    lucide.createIcons();
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
}
