import React, { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";

interface TamilNaduMapProps {
  pickup: string;
  destination: string;
  progress: number; // 0 to 100
  cargoTemp: number;
}

interface Node {
  name: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
  labelPosition: "left" | "right" | "top" | "bottom";
}

export const TamilNaduMap: React.FC<TamilNaduMapProps> = ({
  pickup,
  destination,
  progress,
  cargoTemp,
}) => {
  const [mapMode, setMapMode] = useState<"vector" | "google">("vector");
  const [truckPos, setTruckPos] = useState({ x: 100, y: 160 });
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  const API_KEY =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    "";

  const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY.trim() !== "";

  // Baseline grid matching coordinates of Tamil Nadu hubs (Vector & real Geospatial)
  const urbanHubs: Record<string, Node> = {
    Madurai: { name: "Madurai (மதுரை)", x: 80, y: 220, lat: 9.9252, lng: 78.1198, labelPosition: "left" },
    Coimbatore: { name: "Coimbatore (கோவை)", x: 40, y: 150, lat: 11.0168, lng: 76.9558, labelPosition: "top" },
    Salem: { name: "Salem (சேலம்)", x: 110, y: 110, lat: 11.6643, lng: 78.1460, labelPosition: "right" },
    Trichy: { name: "Trichy (திருச்சி)", x: 130, y: 170, lat: 10.7905, lng: 78.7047, labelPosition: "right" },
    Theni: { name: "Theni (தேனி)", x: 50, y: 230, lat: 10.0118, lng: 77.4777, labelPosition: "left" },
    Thanjavur: { name: "Thanjavur (தஞ்சை)", x: 165, y: 165, lat: 10.7870, lng: 79.1378, labelPosition: "bottom" },
    Chennai: { name: "Chennai Koyambedu (சென்னை)", x: 210, y: 40, lat: 13.0694, lng: 80.2048, labelPosition: "right" },
  };

  // Fuel Stations coordinates matching route intervals (Vector & Geospatial)
  const fuelStations = [
    { name: "IndianOil Pump", x: 95, y: 130, lat: 11.4500, lng: 78.0200, distance: "2 km", color: "#FF6D00" },
    { name: "BP Highway Fuel", x: 145, y: 105, lat: 12.3000, lng: 79.4000, distance: "3 km", color: "#0091EA" },
    { name: "HP Express Station", x: 105, y: 195, lat: 10.3500, lng: 78.3000, distance: "4 km", color: "#D50000" }
  ];

  // Safe fallback resolver for any typed inputs
  const getNode = (name: string): Node => {
    const lower = name.toLowerCase();
    if (lower.includes("madurai")) return urbanHubs.Madurai;
    if (lower.includes("coimbatore") || lower.includes("கோவை")) return urbanHubs.Coimbatore;
    if (lower.includes("salem") || lower.includes("சேலம்")) return urbanHubs.Salem;
    if (lower.includes("trichy") || lower.includes("திருச்சி")) return urbanHubs.Trichy;
    if (lower.includes("theni") || lower.includes("தேனி")) return urbanHubs.Theni;
    if (lower.includes("thanjavur") || lower.includes("தஞ்சாவூர்")) return urbanHubs.Thanjavur;
    if (lower.includes("chennai") || lower.includes("சென்னை") || lower.includes("koyambedu")) return urbanHubs.Chennai;
    
    // Default fallback
    return urbanHubs.Madurai;
  };

  const startNode = getNode(pickup);
  const endNode = getNode(destination);

  // Derive intermediate nodes to make realistic 3-point curved routes if possible
  let midpoint = { x: (startNode.x + endNode.x) / 2, y: (startNode.y + endNode.y) / 2 };
  
  // Madurai -> Chennai naturally routes via Trichy bypass
  if (startNode.name.includes("Madurai") && endNode.name.includes("Chennai")) {
    midpoint = { x: urbanHubs.Trichy.x, y: urbanHubs.Trichy.y };
  }
  // Coimbatore -> Chennai naturally routes via Salem bypass
  if (startNode.name.includes("Coimbatore") && endNode.name.includes("Chennai")) {
    midpoint = { x: urbanHubs.Salem.x, y: urbanHubs.Salem.y };
  }

  // Calculate coordinates of truck dynamically along quadratic bezier curve based on progress pct
  useEffect(() => {
    const t = progress / 100;
    const u = 1 - t;
    const x = u * u * startNode.x + 2 * u * t * midpoint.x + t * t * endNode.x;
    const y = u * u * startNode.y + 2 * u * t * midpoint.y + t * t * endNode.y;
    setTruckPos({ x, y });
  }, [progress, pickup, destination]);

  // Compute geospatially interpolated truck lat/lng
  const truckLat = startNode.lat + (endNode.lat - startNode.lat) * (progress / 100);
  const truckLng = startNode.lng + (endNode.lng - startNode.lng) * (progress / 100);

  // Center of Google Map for viewing route
  const getMapCenter = () => {
    return {
      lat: (startNode.lat + endNode.lat) / 2,
      lng: (startNode.lng + endNode.lng) / 2,
    };
  };

  return (
    <div className="relative w-full bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm overflow-hidden flex flex-col items-stretch space-y-4">
      {/* Dynamic Header Toggle block */}
      <div className="flex justify-between items-center bg-slate-100 rounded-xl p-1.5 self-stretch">
        <button
          type="button"
          onClick={() => setMapMode("vector")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mapMode === "vector"
              ? "bg-white text-slate-800 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          📍 Simplified Vector Map
        </button>
        <button
          type="button"
          onClick={() => setMapMode("google")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mapMode === "google"
              ? "bg-white text-slate-800 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          🗺️ Interactive google Map
        </button>
      </div>

      {/* Render selected map interface */}
      {mapMode === "vector" ? (
        <div className="relative min-h-[300px] flex flex-col items-center justify-center">
          <div className="absolute top-2 left-4 text-[10px] font-mono font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Tamil Nadu Route Vector Active
          </div>

          <svg
            viewBox="0 0 260 280"
            className="w-full max-w-[285px] h-auto drop-shadow-sm select-none"
          >
            {/* State outlines of Tamil Nadu geography */}
            <path
              d="M 30,120 C 15,140 25,200 40,240 C 50,265 80,275 110,270 C 140,265 170,250 180,210 C 190,190 220,160 215,115 C 210,90 240,70 230,35 C 210,15 180,25 150,30 C 120,35 90,50 70,80 C 50,100 40,110 30,120 Z"
              fill="#E8F5E9"
              stroke="#C8E6C9"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />

            {/* Ambient State Highways network lines */}
            <path d="M 40,150 L 110,110 L 210,40" fill="none" stroke="#A5D6A7" strokeWidth="0.8" opacity="0.6" />
            <path d="M 80,220 L 130,170 L 210,40" fill="none" stroke="#A5D6A7" strokeWidth="0.8" opacity="0.6" />
            <path d="M 80,220 L 50,230" fill="none" stroke="#A5D6A7" strokeWidth="0.8" opacity="0.6" />
            <path d="M 130,170 L 165,165" fill="none" stroke="#A5D6A7" strokeWidth="0.8" opacity="0.6" />

            {/* Dynamic Computed Delivery Path */}
            <path
              d={`M ${startNode.x},${startNode.y} Q ${midpoint.x},${midpoint.y} ${endNode.x},${endNode.y}`}
              fill="none"
              stroke="#1B5E20"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="4 3"
            />

            {/* Dynamic active progress road line background */}
            <path
              d={`M ${startNode.x},${startNode.y} Q ${midpoint.x},${midpoint.y} ${endNode.x},${endNode.y}`}
              fill="none"
              stroke="#2E7D32"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDashoffset={200 - (progress * 2)}
              strokeDasharray="200"
              opacity="0.8"
            />

            {/* Start Station Pulse Node */}
            <circle cx={startNode.x} cy={startNode.y} r="6" fill="#1B5E20" opacity="0.3" className="animate-pulse" />
            <circle cx={startNode.x} cy={startNode.y} r="3" fill="#2E7D32" />

            {/* End Station Pulse Node */}
            <circle cx={endNode.x} cy={endNode.y} r="8" fill="#D32F2F" opacity="0.2" className="animate-pulse" />
            <circle cx={endNode.x} cy={endNode.y} r="4.5" fill="#D32F2F" />

            {/* Major Hub Markers */}
            {Object.values(urbanHubs).map((node) => {
              const isSelected = node.name === startNode.name || node.name === endNode.name;
              return (
                <g key={node.name}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? "3" : "1.8"}
                    fill={isSelected ? "#1B5E20" : "#757575"}
                  />
                  <text
                    x={node.x + (node.labelPosition === "right" ? 5 : node.labelPosition === "left" ? -5 : 0)}
                    y={node.y + (node.labelPosition === "bottom" ? 8 : node.labelPosition === "top" ? -5 : 2)}
                    textAnchor={node.labelPosition === "right" ? "start" : node.labelPosition === "left" ? "end" : "middle"}
                    fontSize="6"
                    fontWeight={isSelected ? "bold" : "normal"}
                    fill={isSelected ? "#1B5E20" : "#616161"}
                    className="font-sans font-medium"
                  >
                    {node.name.split(" ")[0]}
                  </text>
                </g>
              );
            })}

            {/* Interactive Delivery Truck Marker gliding dynamically */}
            <g transform={`translate(${truckPos.x - 7}, ${truckPos.y - 7})`}>
              <circle
                cx="7"
                cy="7"
                r="10"
                fill={cargoTemp < 15 ? "#C8E6C9" : "#FFE082"}
                opacity="0.75"
                className="animate-pulse"
              />
              <rect x="2" y="4" width="7" height="6" rx="1" fill="#2E7D32" />
              <rect x="8" y="6" width="3" height="4" rx="1" fill="#1B5E20" />
              <circle cx="4.5" cy="10.5" r="1.5" fill="#212121" />
              <circle cx="8.5" cy="10.5" r="1.5" fill="#212121" />
              <circle cx="3.5" cy="5.5" r="1" fill={cargoTemp < 15 ? "#00E5FF" : "#FF9100"} />
            </g>

            {/* Nearest Fuel Stations Overlay pins */}
            {fuelStations.map((station) => (
              <g key={station.name}>
                <circle cx={station.x} cy={station.y} r="4" fill={station.color} opacity="0.2" className="animate-pulse" />
                <circle cx={station.x} cy={station.y} r="2" fill={station.color} stroke="#FFFFFF" strokeWidth="0.4" />
                <text
                  x={station.x}
                  y={station.y - 3.5}
                  fontSize="4.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill={station.color}
                  className="font-mono"
                >
                  ⛽ {station.name.split(" ")[0]}
                </text>
              </g>
            ))}
          </svg>
        </div>
      ) : (
        /* Google Maps render container */
        <div className="relative min-h-[300px] h-[350px] w-full rounded-xl overflow-hidden border border-slate-200">
          {!hasValidKey ? (
            <div className="absolute inset-0 bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="max-w-md space-y-4">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-full inline-block border border-amber-500/20">
                  ⚠️
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Google Maps Platform Key Missing
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed text-left border-l border-slate-800 pl-3">
                  <strong>To add your API key:</strong><br />
                  1. Get an API key: <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Console Link</a><br />
                  2. Open <strong>Settings</strong> (⚙️ gear icon, top-right corner) → <strong>Secrets</strong> → type <code>GOOGLE_MAPS_PLATFORM_KEY</code> → paste your API key and press <strong>Enter</strong>.<br />
                  The app will automatically compile and show this map without a reload!
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setMapMode("vector")}
                    className="text-[11px] font-black px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    ⬅️ Go Back to Simplified Vector Map
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={getMapCenter()}
                defaultZoom={8}
                mapId="FARMGO_TRACKING_MAP"
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                style={{ width: "100%", height: "100%" }}
                gestureHandling="cooperative"
              >
                {/* 1. Pickup Station Node */}
                <AdvancedMarker
                  position={{ lat: startNode.lat, lng: startNode.lng }}
                  onClick={() => setActiveMarker("pickup")}
                >
                  <Pin background="#1B5E20" glyphColor="#ffffff" scale={1.1} />
                </AdvancedMarker>

                {/* 2. Destination Station Node */}
                <AdvancedMarker
                  position={{ lat: endNode.lat, lng: endNode.lng }}
                  onClick={() => setActiveMarker("dest")}
                >
                  <Pin background="#D32F2F" glyphColor="#ffffff" scale={1.1} />
                </AdvancedMarker>

                {/* 3. Realtime Truck Pin marker */}
                <AdvancedMarker
                  position={{ lat: truckLat, lng: truckLng }}
                  onClick={() => setActiveMarker("truck")}
                >
                  <div className="relative flex items-center justify-center p-1 bg-white border border-emerald-600 rounded-full shadow-md w-8 h-8 cursor-pointer transform hover:scale-105 transition-transform">
                    <span className="text-lg">🚚</span>
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                  </div>
                </AdvancedMarker>

                {/* Info Windows for interactability */}
                {activeMarker === "truck" && (
                  <InfoWindow
                    position={{ lat: truckLat, lng: truckLng }}
                    onCloseClick={() => setActiveMarker(null)}
                  >
                    <div className="p-1 max-w-[150px] space-y-1">
                      <div className="text-[11px] font-bold text-slate-800">🚜 Active Transit</div>
                      <div className="text-[9px] text-slate-500">Progress: <strong>{progress.toFixed(0)}%</strong></div>
                      <div className="text-[9px] text-slate-500">Cargo Temp: <strong className="text-sky-600">{cargoTemp}°C</strong></div>
                    </div>
                  </InfoWindow>
                )}

                {activeMarker === "pickup" && (
                  <InfoWindow
                    position={{ lat: startNode.lat, lng: startNode.lng }}
                    onCloseClick={() => setActiveMarker(null)}
                  >
                    <div className="p-1">
                      <div className="text-[10px] font-bold text-emerald-800 font-sans">🌾 Dispatch Origin</div>
                      <div className="text-[10px] font-mono font-bold text-slate-600">{pickup}</div>
                    </div>
                  </InfoWindow>
                )}

                {activeMarker === "dest" && (
                  <InfoWindow
                    position={{ lat: endNode.lat, lng: endNode.lng }}
                    onCloseClick={() => setActiveMarker(null)}
                  >
                    <div className="p-1">
                      <div className="text-[10px] font-bold text-rose-800 font-sans">🏅 Wholesale Hub</div>
                      <div className="text-[10px] font-mono font-bold text-slate-600">{destination}</div>
                    </div>
                  </InfoWindow>
                )}

                {/* 4. Fuel Stations Overlay pins */}
                {fuelStations.map((station, idx) => (
                  <AdvancedMarker
                    key={idx}
                    position={{ lat: station.lat, lng: station.lng }}
                    onClick={() => setActiveMarker(`fuel-${idx}`)}
                  >
                    <div className="flex items-center justify-center p-0.5 bg-amber-50 rounded-full border border-amber-500 shadow-sm w-6 h-6 hover:scale-105 transition-transform text-xs">
                      ⛽
                    </div>
                  </AdvancedMarker>
                ))}

                {fuelStations.map((station, idx) => (
                  activeMarker === `fuel-${idx}` && (
                    <InfoWindow
                      key={`info-${idx}`}
                      position={{ lat: station.lat, lng: station.lng }}
                      onCloseClick={() => setActiveMarker(null)}
                    >
                      <div className="p-1 space-y-0.5">
                        <div className="text-[10px] font-bold text-amber-700">{station.name}</div>
                        <div className="text-[9px] font-medium text-slate-500">Distance from route: {station.distance}</div>
                      </div>
                    </InfoWindow>
                  )
                ))}
              </Map>
            </APIProvider>
          )}
        </div>
      )}

      {/* Embedded Route indicators info footer bar */}
      <div className="w-full flex items-center justify-between text-[11px] font-medium text-slate-700 bg-white/90 backdrop-blur border border-slate-150 rounded-lg p-2.5 mt-2 shadow-xs font-mono z-10 gap-2">
        <div className="flex flex-col">
          <span className="text-[9px] text-emerald-700 uppercase tracking-widest font-sans font-bold">FROM / புறப்பாடு</span>
          <span className="truncate max-w-[100px] text-slate-900 font-bold">{pickup}</span>
        </div>

        <div className="flex-1 flex items-center justify-center gap-1 text-slate-400">
          <span className="h-0.5 flex-1 bg-emerald-200"></span>
          <span className="text-emerald-800 font-extrabold text-xs">{Math.round(progress)}%</span>
          <span className="h-0.5 flex-1 bg-emerald-100"></span>
        </div>

        <div className="flex flex-col text-right">
          <span className="text-[9px] text-rose-700 uppercase tracking-widest font-sans font-bold">TO / சேருமிடம்</span>
          <span className="truncate max-w-[100px] text-slate-900 font-bold">{destination}</span>
        </div>
      </div>
    </div>
  );
};
