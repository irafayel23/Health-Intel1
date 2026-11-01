// MHO sidebar and theme controls.
// Classic script: load through mho.html; cross-feature functions share its page scope.
// Desktop navigation stays visible. portal-navigation.js wraps this hook
// to open and close the drawer on mobile only.
function toggleSidebar() {}

function toggleDarkMode() {
    HealthIntelTheme.toggle();
}
