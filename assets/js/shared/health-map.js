(() => {
// ==========================================
// 1. REAL GIS HEATMAP USING LEAFLET.JS
// ==========================================

// Public OpenStreetMap landmarks for aggregate case displays.
// Village nodes for four barangays, building centers for the two barangay halls.
const barangayMapAnchors = new Map([
    ['Alegria', [10.6437925, 123.0836283]], // node 5164954968
    ['Blumentritt', [10.6168903, 123.024629]], // node 12383768082
    ['Caliban', [10.5848369, 123.071639]], // node 9319868102
    ['Cansilayan', [10.5595243, 123.0187053]], // way 1340802275
    ['Salvacion', [10.6204991, 123.0628055]], // node 12402668937
    ['Sta. Rosa', [10.57327875, 123.1013825]], // way 1296617860
]);

function useBarangayMapAnchor(barangay) {
    const coordinates = barangayMapAnchors.get(barangay.name);
    if (!coordinates) return barangay;
    const [lat, lng] = coordinates;
    return { ...barangay, lat, lng };
}

// Check if the map container exists before loading
const mapContainer = document.getElementById("murciaMap");

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
    const summaryOnly = mapContainer.dataset.mapMode === 'summary';
    const heatView = summaryOnly ? null : window.HealthIntelHeatView?.bind(map,mapContainer,{onChange:()=>{hideDetails();layoutLabels();}});
    const caseBreakdown = summaryOnly ? null : window.HealthIntelMapBreakdown?.bind(mapContainer,{onOpen:()=>hideDetails()});
    let initialViewSet = false;
    let boundaries;
    let boundaryData;
    let assignedNames;
    let boundariesReady = false;
    const boundaryStatus = document.getElementById('heatmap-boundary-status');
    const boundaryPane = map.createPane('barangayBoundaries');
    boundaryPane.style.zIndex = '425';

    function drawBoundaries() {
        if (!boundaryData || boundaries || (summaryOnly && !assignedNames)) return;
        try {
            const layer = L.geoJSON(boundaryData, {
                filter: feature => !summaryOnly || assignedNames.has(feature.properties.name),
                renderer: L.canvas({ pane: 'barangayBoundaries' }),
                style: { color: '#3730a3', weight: 2, dashArray: '5 4', fillOpacity: 0.06 },
                onEachFeature: (feature, polygon) => polygon.bindTooltip(feature.properties.name),
                attribution: 'Barangay boundaries: NAMRIA/PSA via OCHA COD-AB'
            });
            if (!layer.getBounds().isValid()) throw new Error('Barangay boundaries unavailable.');
            boundaries = layer.addTo(map);
            boundaryStatus.textContent = summaryOnly
                ? 'Dashed outline shows the indicative barangay boundary.'
                : 'Dashed outlines show indicative pilot barangay boundaries.';
        } catch {
            boundaryStatus.textContent = 'Barangay boundaries are unavailable. Case totals can still be viewed.';
        }
    }
    fetch('assets/img/maps/murcia-pilot-barangays.geojson', { signal: AbortSignal.timeout(4000) })
        .then(response => {
            if (!response.ok) throw new Error('Barangay boundaries unavailable.');
            return response.json();
        })
        .then(data => { boundaryData = data; drawBoundaries(); })
        .catch(() => { boundaryStatus.textContent = 'Barangay boundaries are unavailable. Case totals can still be viewed.'; })
        .finally(() => {
            boundariesReady = true;
            fitBarangays();
        });

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
        const size = map.getSize();
        if (!size.x || !size.y || !mapContainer.offsetHeight) return;

        const compact = map.getZoom() <= 12 || size.x < 540;
        mapContainer.classList.toggle('heatmap-compact-markers', compact);
        const boxes = mapCircles.map(marker => {
            const point = map.latLngToContainerPoint(marker.getLatLng());
            const radius = (marker.getElement()?.offsetWidth || 0) / 2;
            return {point, radius};
        });
        const occupied = boxes.filter(({radius}) => radius > 0).map(({point, radius}) => ({
            left:point.x-radius, right:point.x+radius, top:point.y-radius, bottom:point.y+radius,
        }));
        const mapRect = mapContainer.getBoundingClientRect();
        for (const control of mapContainer.querySelectorAll('.leaflet-control-zoom, .heatmap-expand-controls, .heatmap-view-switch, .heatmap-intensity-legend, .leaflet-control-attribution')) {
            if (!control.offsetWidth || !control.offsetHeight) continue;
            const rect = control.getBoundingClientRect();
            occupied.push({left:rect.left-mapRect.left, right:rect.right-mapRect.left,
                top:rect.top-mapRect.top, bottom:rect.bottom-mapRect.top});
        }

        mapLabels.forEach((label, index) => {
            const content = label.getElement()?.firstElementChild;
            if (!content) return;
            const {point, radius} = boxes[index];
            const gap = radius + 7;
            const position = () => {
                const width = content.offsetWidth;
                const height = content.offsetHeight;
                const left = -width / 2;
                const top = -height / 2;
                const candidates = [
                    [left, gap], [gap, top], [-gap-width, top], [left, -gap-height],
                    [gap, gap], [-gap-width, gap], [gap, -gap-height], [-gap-width, -gap-height],
                ];
                for (const [x, y] of candidates) {
                    const box = {left:point.x+x, top:point.y+y, right:point.x+x+width, bottom:point.y+y+height};
                    if (box.left < 4 || box.top < 4 || box.right > size.x-4 || box.bottom > size.y-4) continue;
                    if (occupied.some(other => box.left < other.right+4 && box.right > other.left-4 &&
                        box.top < other.bottom+4 && box.bottom > other.top-4)) continue;
                    occupied.push(box);
                    content.style.setProperty('--label-offset-x', x+'px');
                    content.style.setProperty('--label-offset-y', y+'px');
                    return true;
                }
                return false;
            };
            content.classList.remove('heatmap-label-name-only');
            let placed = position();
            if (!placed && content.querySelector('.heatmap-marker-attention')) {
                content.classList.add('heatmap-label-name-only');
                placed = position();
            }
            content.style.visibility = placed ? 'visible' : 'hidden';
        });
    }
    map.on('zoomend moveend resize', layoutLabels);

    function fitBarangays() {
        if (initialViewSet || !boundariesReady || !mapContainer.offsetHeight) return;
        const bounds = boundaries?.getBounds() ?? L.latLngBounds([]);
        if (mapCircles.length) bounds.extend(L.featureGroup(mapCircles).getBounds());
        if (!bounds.isValid()) return;
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: summaryOnly ? 14 : 12, animate: false });
        initialViewSet = true;
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
    const iconOnly = mapContainer.id === 'murciaMap';
    if(iconOnly){refreshButton.className='heatmap-expand-button';refreshButton.innerHTML="<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M20 7v5h-5M4 17v-5h5\"/><path d=\"M6 8a7 7 0 0 1 11-2l3 3M4 15l3 3a7 7 0 0 0 11-2\"/></svg>";refreshButton.dataset.mhoHint='Refresh map';}
    else status?.before(refreshButton);
    let loading=false;
    let pendingRefresh=false;
    let loaded=false;
    const visible=()=>!document.hidden && !mapContainer.closest('.view-section')?.classList.contains('hidden');
    function refreshMap() {
      if(loading){pendingRefresh=true;return;}
      loading=true;refreshButton.disabled=true;
      if(!iconOnly)refreshButton.textContent='Refreshing…';
      return fetch('http://localhost:3000/api/heatmap-data')
      .then(response => {
          if (!response.ok) throw new Error('Unable to load active case totals.');
          return response.json();
      })
      .then(result => {
          if (!result.success) throw new Error('Unable to load active case totals.');

          const barangays = result.data.map(useBarangayMapAnchor);
          assignedNames = new Set(barangays.map(row => row.name));
          drawBoundaries();
          heatView?.update(barangays);
          const refreshedAt = new Date(result.fetched_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
          caseBreakdown?.update(barangays,refreshedAt);
          const pinnedLocation=pinnedDetails && detailsCircle?detailsCircle.getLatLng():null;
          const oldScroll=detailsPanel.querySelector('.heatmap-info-body')?.scrollTop || 0;
          const hadDetailsFocus=detailsPanel.contains(document.activeElement);
          hideDetails();
          mapCircles.forEach(circle=>circle.remove());
          mapLabels.forEach(label=>label.remove());
          mapCircles.length=0;mapLabels.length=0;

          barangays.forEach((brgy) => {
              // Equal-sized circles classify recent recorded case activity independently of patient severity.
              const circle = L.marker([brgy.lat, brgy.lng], {
                icon: L.divIcon({className:'heatmap-summary-marker',html:HealthIntelMapDetails.marker(brgy),iconSize:[88,88],iconAnchor:[44,44]}),
                keyboard:false,
                bubblingMouseEvents: false,
              }).addTo(map);

              const attention=[HealthIntelMapDetails.classification(brgy).label + ' · case volume'];

              const label = L.marker([brgy.lat, brgy.lng], {
                  interactive: false,
                  keyboard: false,
                  icon: L.divIcon({
                      className: 'heatmap-label',
                      html: `<div class="heatmap-label-content"><strong>${escapeMapText(brgy.name)}</strong>${attention.map(item=>`<span class="heatmap-marker-attention">${item}</span>`).join('')}</div>`,
                      iconSize: [0, 0],
                      iconAnchor: [0, 0]
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
              circleElement.setAttribute('aria-label', HealthIntelMapDetails.summary(brgy)+' Open barangay assessment and patient severity details.');
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
          if (status) status.textContent = summaryOnly
              ? 'Locally configured case-volume bands over the current calendar month through today; open a marker for the calculation and separate active totals. Updated: ' + refreshedAt + ' (Philippine time).'
              : `Barangay Summary shows month-to-date case volume. Heat View uses the same monthly bands: green 1-10, orange 11-20, red 21+. Updated: ${refreshedAt} (Philippine time). Neither view is an outbreak-risk rating.`;
          fitBarangays();
          layoutLabels();
          loaded=true;
      })
      .catch(error => {
          caseBreakdown?.markStale();
          if (status) status.textContent = loaded?'Refresh failed. Showing the last loaded totals. Try Refresh map again.':'Map data could not be loaded. Check the connection and use Refresh map.';
          console.error('Error loading heatmap data:', error);
      }).finally(()=>{loading=false;refreshButton.disabled=false;if(!iconOnly)refreshButton.textContent='Refresh map';if(pendingRefresh){pendingRefresh=false;refreshMap();}});
    }
    refreshButton.addEventListener('click',refreshMap);
    window.addEventListener('health-intel:cases-changed',refreshMap);
    document.querySelectorAll('[data-target="view-heatmap"]').forEach(button=>button.addEventListener('click',()=>requestAnimationFrame(refreshMap)));
    document.addEventListener('visibilitychange',()=>{if(visible())refreshMap();});
    const refreshTimer=setInterval(()=>{if(visible())refreshMap();},30000);
    window.addEventListener('pagehide',()=>clearInterval(refreshTimer),{once:true});
    const fullscreen=HealthIntelMapFullscreen.bind(mapContainer,()=>{
        map.invalidateSize({animate:false});heatView?.resize();positionDetails();layoutLabels();
    });
    if(iconOnly){
        fullscreen.controls.append(refreshButton);
        if(caseBreakdown)fullscreen.controls.append(caseBreakdown.button);
    }
    L.DomEvent.disableClickPropagation(fullscreen.controls);
    L.DomEvent.disableScrollPropagation(fullscreen.controls);
    refreshMap();

    // Wait for the hidden map tab to have a real layout before fitting its circles.
    new ResizeObserver(entries => {
        if (entries[0].contentRect.width > 0 && entries[0].contentRect.height > 0) {
            map.invalidateSize({ animate: false });
            heatView?.resize();
            fitBarangays();
            positionDetails();
        }
    }).observe(mapContainer);
}

})();
