
      function escapeText(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

      let isDarkMode = false; 
      function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        if(isDarkMode) {
          document.documentElement.classList.add('dark');
          document.getElementById('theme-icon').setAttribute('data-lucide', 'moon');
        } else {
          document.documentElement.classList.remove('dark');
          document.getElementById('theme-icon').setAttribute('data-lucide', 'sun');
        }
        lucide.createIcons();
      }
      
      let sidebarOpen = true;
      function toggleSidebar() {
        sidebarOpen = !sidebarOpen;
        const sidebar = document.getElementById('sidebar');
        const icon = document.getElementById('sidebar-icon');
        const labels = document.querySelectorAll('.sidebar-label');
        const text = document.getElementById('sidebar-text');
        
        if (sidebarOpen) {
          sidebar.classList.remove('w-20');
          sidebar.classList.add('w-64');
          labels.forEach(l => { l.classList.remove('opacity-0', 'hidden'); l.classList.add('opacity-100'); });
          text.classList.remove('opacity-0', 'hidden'); text.classList.add('opacity-100');
          icon.setAttribute('data-lucide', 'panel-left-close');
        } else {
          sidebar.classList.remove('w-64');
          sidebar.classList.add('w-20');
          labels.forEach(l => { l.classList.remove('opacity-100'); l.classList.add('opacity-0', 'hidden'); });
          text.classList.remove('opacity-100'); text.classList.add('opacity-0', 'hidden');
          icon.setAttribute('data-lucide', 'panel-left-open');
        }
        lucide.createIcons();
        if(typeof map !== 'undefined') {
          setTimeout(() => map.invalidateSize(), 300);
        }
      }
    