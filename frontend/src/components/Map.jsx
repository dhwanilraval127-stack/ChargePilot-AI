import React, { useEffect, useRef } from 'react';

const Map = ({ center = [20.5937, 78.9629], zoom = 5, stations = [], onStationClick }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const leafletLoadedRef = useRef(false);

  useEffect(() => {
    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      if (leafletLoadedRef.current) return;

      try {
        // Load Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          link.crossOrigin = '';
          document.head.appendChild(link);
        }

        // Load Leaflet JS
        if (!window.L) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
            script.crossOrigin = '';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        leafletLoadedRef.current = true;
        initializeMap();
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
      }
    };

    loadLeaflet();

    return () => {
      // Cleanup
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initializeMap = () => {
    if (!window.L || !mapRef.current || mapInstanceRef.current) return;

    try {
      const L = window.L;

      // Fix default marker icon
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Create map
      mapInstanceRef.current = L.map(mapRef.current).setView(center, zoom);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      console.log('✅ Map initialized successfully');
    } catch (error) {
      console.error('❌ Map initialization error:', error);
    }
  };

  // Update center
  useEffect(() => {
    if (mapInstanceRef.current && center && window.L) {
      mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom());
    }
  }, [center]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !stations) return;

    const L = window.L;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      try {
        marker.remove();
      } catch (e) {
        console.error('Error removing marker:', e);
      }
    });
    markersRef.current = [];

    // Add new markers
    try {
      stations.forEach((station) => {
        if (!station.latitude || !station.longitude) return;

        // Create custom icon based on verification
        const iconColor = station.is_verified === 1 ? 'green' : 'blue';
        const iconUrl = `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png`;

        const customIcon = L.icon({
          iconUrl: iconUrl,
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

        const marker = L.marker([station.latitude, station.longitude], { icon: customIcon })
          .addTo(mapInstanceRef.current);

        // Popup content
        const popupContent = `
          <div style="min-width: 200px; font-family: sans-serif;">
            <h3 style="font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">${station.name}</h3>
            <p style="font-size: 12px; color: #666; margin: 0 0 8px 0;">${station.address}, ${station.city}</p>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
              ${station.is_verified === 1 ? 
                '<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">✓ Verified</span>' : 
                ''
              }
              <span style="font-size: 12px; color: #333;">⚡ ${station.power_kw}kW</span>
            </div>
            <div style="font-size: 12px; color: #333;">
              <div style="margin-bottom: 4px;">Health: <strong>${station.health_score}/100</strong></div>
              <div>Rating: <strong>${station.avg_rating.toFixed(1)}</strong>⭐</div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        if (onStationClick) {
          marker.on('click', () => {
            onStationClick(station);
          });
        }

        markersRef.current.push(marker);
      });

      // Fit bounds if we have stations
      if (stations.length > 0 && markersRef.current.length > 0) {
        const bounds = L.latLngBounds(
          stations
            .filter(s => s.latitude && s.longitude)
            .map(s => [s.latitude, s.longitude])
        );
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }

      console.log(`✅ Added ${markersRef.current.length} markers to map`);
    } catch (error) {
      console.error('❌ Error adding markers:', error);
    }
  }, [stations, onStationClick]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height: '100%', 
        width: '100%',
        minHeight: '400px',
        background: '#e5e7eb'
      }}
    >
      {!leafletLoadedRef.current && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#666'
        }}>
          <div className="spinner"></div>
          <span style={{ marginLeft: '12px' }}>Loading map...</span>
        </div>
      )}
    </div>
  );
};

export default Map;