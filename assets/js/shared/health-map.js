(() => {
// ==========================================
// 1. REAL GIS HEATMAP USING LEAFLET.JS
// ==========================================

// Check if the map container exists before loading
const mapContainer = document.getElementById("murciaMap") || document.getElementById("bhwMap");

if (mapContainer) {
    // Initialize the map and set the view perfectly over Murcia, Negros Occidental
    // Coordinates: Latitude 10.6120, Longitude 123.0483, Zoom Level 12
    const map = L.map(mapContainer).setView([10.6120, 123.0483], 12);

    // Load the real map tiles from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors | HEALTH-INTEL GIS'
    }).addTo(map);

    const mapCircles = [];
    const mapLabels = [];
    const status = document.getElementById('heatmap-status');
    let initialViewSet = false;

    // Position the details inside the map so hovering never requires panning.
    const detailsPanel = document.createElement('div');
    detailsPanel.className = 'heatmap-info-panel';
    detailsPanel.hidden = true;
    detailsPanel.setAttribute('role', 'dialog');
    detailsPanel.setAttribute('aria-labelledby', mapContainer.id + '-details-title');
    detailsPanel.innerHTML = '<div class="heatmap-info-content"></div>';
    mapContainer.appendChild(detailsPanel);
    L.DomEvent.disableClickPropagation(detailsPanel);
    L.DomEvent.disableScrollPropagation(detailsPanel);
    let detailsCircle = null;
    let pinnedDetails = false;
    let hideDetailsTimer;
    let restoringMarkerFocus = false;

    function positionDetails() {
        if (detailsPanel.hidden || !detailsCircle || !mapContainer.clientHeight) return;
        const margin = 12;
        const mapRect = mapContainer.getBoundingClientRect();
        let visibleLeft = Math.max(mapRect.left, 0);
        let visibleTop = Math.max(mapRect.top, 0);
        let visibleRight = Math.min(mapRect.right, window.innerWidth);
        let visibleBottom = Math.min(mapRect.bottom, window.innerHeight);
        for (let parent = mapContainer.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            const rect = parent.getBoundingClientRect();
            if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
                visibleLeft = Math.max(visibleLeft, rect.left + parent.clientLeft);
                visibleRight = Math.min(visibleRight, rect.left + parent.clientLeft + parent.clientWidth);
            }
            if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
                visibleTop = Math.max(visibleTop, rect.top + parent.clientTop);
                visibleBottom = Math.min(visibleBottom, rect.top + parent.clientTop + parent.clientHeight);
            }
        }
        const leftEdge = visibleLeft - mapRect.left + margin;
        const topEdge = Math.max(visibleTop - mapRect.top + margin, 64);
        const rightEdge = visibleRight - mapRect.left - margin;
        const bottomEdge = visibleBottom - mapRect.top - margin;
        detailsPanel.style.visibility = rightEdge <= leftEdge || bottomEdge <= topEdge ? 'hidden' : 'visible';
        const availableWidth = Math.max(0, rightEdge - leftEdge);
        const availableHeight = Math.max(0, bottomEdge - topEdge);
        const narrow = availableWidth < 620;
        detailsPanel.classList.toggle('heatmap-info-sheet', narrow);
        detailsPanel.style.width = `${narrow ? availableWidth : 420}px`;
        detailsPanel.style.maxWidth = `${availableWidth}px`;
        detailsPanel.style.maxHeight = `${narrow && availableHeight > 300 ? availableHeight * .72 : availableHeight}px`;
        const width = detailsPanel.offsetWidth;
        const height = detailsPanel.offsetHeight;
        const left = narrow ? leftEdge : Math.max(leftEdge, rightEdge - width);
        const top = narrow ? Math.max(topEdge, bottomEdge - height) : topEdge;
        detailsPanel.style.left = `${left}px`;
        detailsPanel.style.top = `${top}px`;
    }

    function hideDetails() {
        clearTimeout(hideDetailsTimer);
        detailsPanel.hidden = true;
        detailsCircle = null;
        pinnedDetails = false;
    }

    function showDetails(circle, details, pin = false, focus = false) {
        if (pinnedDetails && !pin) return;
        clearTimeout(hideDetailsTimer);
        detailsCircle = circle;
        pinnedDetails = pin;
        detailsPanel.querySelector('.heatmap-info-content').innerHTML = details;
        detailsPanel.hidden = false;
        detailsPanel.querySelector('.heatmap-info-body').scrollTop = 0;
        positionDetails();
        if (focus) detailsPanel.querySelector('.heatmap-info-close').focus({preventScroll:true});
    }

    function closeDetails() {
        const marker = detailsCircle?.getElement();
        const restore = detailsPanel.contains(document.activeElement);
        hideDetails();
        if (restore && marker) {restoringMarkerFocus=true;marker.focus({preventScroll:true});restoringMarkerFocus=false;}
    }

    function scheduleHideDetails() {
        if (!pinnedDetails && !detailsPanel.contains(document.activeElement)) hideDetailsTimer = setTimeout(hideDetails, 180);
    }
    detailsPanel.addEventListener('mouseenter', () => clearTimeout(hideDetailsTimer));
    detailsPanel.addEventListener('mouseleave', scheduleHideDetails);
    detailsPanel.addEventListener('focusin', () => clearTimeout(hideDetailsTimer));
    detailsPanel.addEventListener('focusout', event => {if (!detailsPanel.contains(event.relatedTarget)) scheduleHideDetails();});
    detailsPanel.addEventListener('click', event => {if (event.target.closest('.heatmap-info-close')) closeDetails();});
    detailsPanel.addEventListener('keydown', event => {event.stopPropagation();if (event.key === 'Escape') closeDetails();});
    mapContainer.addEventListener('keydown', event => { if (event.key === 'Escape') closeDetails(); });
    map.on('click', hideDetails);
    map.on('move zoom resize', positionDetails);
    document.addEventListener('scroll', positionDetails, true);
    window.addEventListener('resize', positionDetails);

    function layoutLabels() {
        if (mapContainer.offsetHeight === 0) return;
        const occupied = [];
        const size = map.getSize();
        const offsets = [[0, 0], [0, -42], [0, 42], [-52, 0], [52, 0], [-52, -42], [52, 42]];
        mapLabels.forEach(label => {
            const content = label.getElement()?.firstElementChild;
            if (!content) return;
            const point = map.latLngToContainerPoint(label.getLatLng());
            const width = content.offsetWidth;
            const height = content.offsetHeight;
            let chosen = offsets[0];
            for (const offset of offsets) {
                const box = { left: point.x - 44 + offset[0], top: point.y - 17 + offset[1] };
                box.right = box.left + width;
                box.bottom = box.top + height;
                const withinMap = box.left >= 4 && box.top >= 4 && box.right <= size.x - 4 && box.bottom <= size.y - 4;
                const overlaps = occupied.some(other => box.left < other.right + 5 && box.right > other.left - 5 && box.top < other.bottom + 5 && box.bottom > other.top - 5);
                if (withinMap && !overlaps) { chosen = offset; break; }
            }
            const left = point.x - 44 + chosen[0];
            const top = point.y - 17 + chosen[1];
            occupied.push({ left, top, right: left + width, bottom: top + height });
            content.style.setProperty('--label-offset-x', `${chosen[0]}px`);
            content.style.setProperty('--label-offset-y', `${chosen[1]}px`);
        });
    }
    map.on('zoomend moveend resize', layoutLabels);

    function fitBarangays() {
        if (!initialViewSet && mapCircles.length && mapContainer.offsetHeight > 0) {
            map.fitBounds(L.featureGroup(mapCircles).getBounds(), { padding: [45, 45], maxZoom: 12, animate: false });
            initialViewSet = true;
        }
    }

    function escapeMapText(value) {
        const element = document.createElement('span');
        element.textContent = String(value);
        return element.innerHTML;
    }

    const detailsFor = (barangay, refreshedAt) => HealthIntelMapDetails.render(barangay, refreshedAt, mapContainer.id + '-details-title');

    const refreshButton=document.createElement('button');
    refreshButton.type='button';
    refreshButton.className='mb-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';
    refreshButton.textContent='Refresh map';
    refreshButton.setAttribute('aria-label','Refresh map case totals');
    status?.before(refreshButton);
    let loading=false;
    let pendingRefresh=false;
    let loaded=false;
    const visible=()=>!document.hidden && !mapContainer.closest('.view-section')?.classList.contains('hidden');
    function refreshMap() {
      if(loading){pendingRefresh=true;return;}
      loading=true;refreshButton.disabled=true;
      refreshButton.textContent='Refreshing…';
      return fetch('http://localhost:3000/api/heatmap-data')
      .then(response => {
          if (!response.ok) throw new Error('Unable to load active case totals.');
          return response.json();
      })
      .then(result => {
          if (!result.success) throw new Error('Unable to load active case totals.');

          const barangays = result.data;
          const refreshedAt = new Date(result.fetched_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
          const pinnedLocation=pinnedDetails && detailsCircle?detailsCircle.getLatLng():null;
          const oldScroll=detailsPanel.querySelector('.heatmap-info-body')?.scrollTop || 0;
          const hadDetailsFocus=detailsPanel.contains(document.activeElement);
          hideDetails();
          mapCircles.forEach(circle=>circle.remove());
          mapLabels.forEach(label=>label.remove());
          mapCircles.length=0;mapLabels.length=0;

          barangays.forEach((brgy) => {
              // Screen-sized summary symbols stay readable when the map is zoomed out.
              const calculatedRadius = Math.min(48, 38 + Math.sqrt(brgy.cases) * 2);

              const circle = L.circleMarker([brgy.lat, brgy.lng], {
                color: brgy.color,
                fillColor: brgy.color,
                fillOpacity: 0.3,
                weight: mapContainer.id === 'bhwMap' && String(brgy.id) === String(window.currentBrgyId) ? 4 : 2,
                bubblingMouseEvents: false,
                radius: calculatedRadius
              }).addTo(map);

              const label = L.marker([brgy.lat, brgy.lng], {
                  interactive: false,
                  keyboard: false,
                  icon: L.divIcon({
                      className: 'heatmap-label',
                      html: `<div class="heatmap-label-content"><strong>${escapeMapText(brgy.name)}</strong>${brgy.cases} active ${brgy.cases === 1 ? 'case' : 'cases'}</div>`,
                      iconSize: [88, 34],
                      iconAnchor: [44, 17]
                  })
              }).addTo(map);
              mapLabels.push(label);

              const details = detailsFor(brgy, refreshedAt);
              circle.on('mouseover', () => showDetails(circle, details));
              circle.on('mouseout', scheduleHideDetails);
              circle.on('click', () => showDetails(circle, details, true));
              const circleElement = circle.getElement();
              circleElement.setAttribute('tabindex', '0');
              circleElement.setAttribute('role', 'button');
              circleElement.setAttribute('aria-label', `${brgy.name}: ${brgy.cases} active ${brgy.cases === 1 ? 'case' : 'cases'}. ${brgy.risk}. Open severity details.`);
              circleElement.addEventListener('focus', () => {if (!restoringMarkerFocus) showDetails(circle, details);});
              circleElement.addEventListener('blur', scheduleHideDetails);
              circleElement.addEventListener('keydown', event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      showDetails(circle, details, true, true);
                  }
              });

              mapCircles.push(circle);
              if(pinnedLocation && pinnedLocation.lat===Number(brgy.lat) && pinnedLocation.lng===Number(brgy.lng)) {
                  showDetails(circle,details,true,hadDetailsFocus);detailsPanel.querySelector('.heatmap-info-body').scrollTop=oldScroll;
              }
          });
          if (status) status.textContent = `All recorded active cases · Data refreshed: ${refreshedAt} (Philippine time). Colors summarize recorded severity, not outbreak status.`;
          fitBarangays();
          layoutLabels();
          loaded=true;
      })
      .catch(error => {
          if (status) status.textContent = loaded?'Refresh failed. Showing the last loaded totals. Try Refresh map again.':'Map data could not be loaded. Check the connection and use Refresh map.';
          console.error('Error loading heatmap data:', error);
      }).finally(()=>{loading=false;refreshButton.disabled=false;refreshButton.textContent='Refresh map';if(pendingRefresh){pendingRefresh=false;refreshMap();}});
    }
    refreshButton.addEventListener('click',refreshMap);
    window.addEventListener('health-intel:cases-changed',refreshMap);
    document.querySelectorAll('[data-target="view-heatmap"]').forEach(button=>button.addEventListener('click',()=>requestAnimationFrame(refreshMap)));
    document.addEventListener('visibilitychange',()=>{if(visible())refreshMap();});
    const refreshTimer=setInterval(()=>{if(visible())refreshMap();},30000);
    window.addEventListener('pagehide',()=>clearInterval(refreshTimer),{once:true});
    const fullscreen=HealthIntelMapFullscreen.bind(mapContainer,()=>{
        map.invalidateSize({animate:false});positionDetails();layoutLabels();
    });
    L.DomEvent.disableClickPropagation(fullscreen.controls);
    L.DomEvent.disableScrollPropagation(fullscreen.controls);
    refreshMap();

    // Wait for the hidden map tab to have a real layout before fitting its circles.
    new ResizeObserver(entries => {
        if (entries[0].contentRect.width > 0 && entries[0].contentRect.height > 0) {
            map.invalidateSize({ animate: false });
            fitBarangays();
            positionDetails();
        }
    }).observe(mapContainer);
}

})();
