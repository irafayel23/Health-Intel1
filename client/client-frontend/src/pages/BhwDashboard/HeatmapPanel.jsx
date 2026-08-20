import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function HeatmapPanel() {
  const brgyData = [
    { name: "Purok 1", lat: 10.615, lng: 123.045, cases: 5, risk: "Medium" },
    { name: "Purok 2", lat: 10.61, lng: 123.05, cases: 2, risk: "Low" },
    { name: "Purok 3", lat: 10.608, lng: 123.042, cases: 12, risk: "CRITICAL" },
  ];

  const getColor = (risk) => {
    if (risk === "CRITICAL") return "#ef4444";
    if (risk === "Medium") return "#f59e0b";
    return "#3b82f6";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Barangay Heatmap (Active Cases)
      </h2>
      <p className="text-gray-600 mb-6">
        Live GIS mapping of outbreak clusters within Brgy. Poblacion.
      </p>
      <div className="h-[450px] rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={[10.612, 123.0483]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors | HEALTH-INTEL GIS"
          />
          {brgyData.map((brgy) => (
            <Circle
              key={brgy.name}
              center={[brgy.lat, brgy.lng]}
              radius={brgy.cases * 30}
              pathOptions={{
                color: getColor(brgy.risk),
                fillColor: getColor(brgy.risk),
                fillOpacity: 0.5,
              }}
            >
              <Popup>
                <div style={{ textAlign: "center" }}>
                  <h4 style={{ margin: 0, color: "#0f172a" }}>{brgy.name}</h4>
                  <p
                    style={{
                      margin: "5px 0",
                      color: "#ef4444",
                      fontWeight: "bold",
                    }}
                  >
                    {brgy.cases} Active Cases
                  </p>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Status: {brgy.risk}
                  </span>
                </div>
              </Popup>
            </Circle>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
