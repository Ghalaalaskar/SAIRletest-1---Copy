import React, { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, where, query } from "firebase/firestore";
import { ResponsiveContainer } from "recharts";
import { GoogleMap, MarkerF } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "600px", margin: "auto" };

const ViolationCrashGeoChart = () => {
  const [districtData, setDistrictData] = useState([]);
  const [selectedOption, setSelectedOption] = useState("All");
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const options = ["All", "Violation", "Crash"];
  const mapCenter = { lat: 24.6986, lng: 46.6853 };
  const zoomLevel = 11;

  // Alias map for Arabic neighborhoods
  const aliasMap = {
    "حي الملقا": "Al Malqa",
    "الملقا": "Al Malqa",
    "ملقا": "Al Malqa",
  };

  const toggleDropdown = () => setDropdownOpen(prev => !prev);
  const handleOptionClick = opt => { setSelectedOption(opt); setDropdownOpen(false); };

  // Geocode: prioritize English sublocalities/neighborhoods and skip generic locality 'Riyadh'
  const getDistrict = (lat, lng) =>
        new Promise(resolve => {
          if (!window.google?.maps) return resolve("Unknown");
          const geo = new window.google.maps.Geocoder();
          const typesOrder = [
            'sublocality_level_1',
            'sublocality',
            'neighborhood',
            'administrative_area_level_3',
            'administrative_area_level_2'
          ];
          geo.geocode({ location: { lat, lng }, language: 'en' }, (res, status) => {
            if (status === 'OK' && res.length) {
              const arabic = /[\u0600-\u06FF]/;
              // 1) scan ALL results for the first English component in our expanded list
              for (let type of typesOrder) {
                for (let result of res) {
                  const c = result.address_components.find(c =>
                  c.types.includes(type) && !arabic.test(c.long_name)
                  );
              if (c) {
                    let name = c.long_name;
                    Object.entries(aliasMap).forEach(([k, v]) => {
                      if (name.includes(k)) name = v;
                    });
                    return resolve(name);
                  }
                }
            }
  
              // 2) fallback: split formatted_address but SKIP any leading plus‑codes
              const parts = res[0].formatted_address.split(',').map(p => p.trim());
              let name = parts.find(p => !/^[A-Z0-9+]{4,}$/i.test(p)) || parts[0];
           Object.entries(aliasMap).forEach(([k, v]) => {
                if (name.includes(k)) name = v;
              });
           return resolve(name);
            }
          resolve('Unknown');
        });
       });

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      try {
        const [vSnap, cSnap] = await Promise.all([
          getDocs(collection(db, 'Violation')),
          getDocs(query(collection(db, 'Crash'), where('Status', '==', 'Emergency SOS'))),
        ]);
        const events = [];
        vSnap.forEach(doc => {
          const d = doc.data();
          if (d.time && d.position) events.push({ ...d.position, type: 'violation' });
        });
        cSnap.forEach(doc => {
          const d = doc.data();
          if (d.time && d.position) events.push({ ...d.position, type: 'crash' });
        });

        const enriched = await Promise.all(
          events.map(async ev => {
            const district = await getDistrict(ev.latitude, ev.longitude);
            return { ...ev, district };
          })
        );

        const mapAgg = new Map();
        enriched.forEach(ev => {
          const name = (ev.district || 'Unknown').trim();
          if (!mapAgg.has(name)) {
            mapAgg.set(name, { violation: 0, crash: 0, latSum: 0, lngSum: 0, count: 0 });
          }
          const entry = mapAgg.get(name);
          entry[ev.type]++;
          entry.latSum += ev.latitude;
          entry.lngSum += ev.longitude;
          entry.count++;
        });

        const dataArr = Array.from(mapAgg.entries()).map(([district, e]) => ({
          district,
          violation: e.violation,
          crash: e.crash,
          total: e.violation + e.crash,
          position: { lat: e.latSum / e.count, lng: e.lngSum / e.count },
        }));

        if (mounted) setDistrictData(dataArr);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchAll();
    return () => { mounted = false; };
  }, []);
  const filteredMapData = districtData.filter(d => {
    if (selectedOption === 'All') return true;
    return selectedOption === 'Violation' ? d.violation > 0 : d.crash > 0;
  });
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <div style={{ width: "100%", height: "400px", display: "flex", justifyContent: "space-between" }}>
        {/* Map Container */}
        <div
          style={{
            width: "48%",
            height: "100%",
            position: "relative",
            borderRadius: "15px",
            overflow: "hidden",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            background: "#f4f4f4",
          }}
        >
          {/* Dropdown Filter */}
          <div className="searchContainer" style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
            <div className="selectWrapper" style={{ border: "2px solid #4CAF50", backgroundColor: "#fff", borderRadius: 5, padding: 5 }}>
              <div onClick={toggleDropdown} style={{ cursor: "pointer", padding: "5px 10px", width: 200, position: "relative", textAlign: "left" }}>
                {selectedOption === 'All' ? 'Filter by Incident Type' : selectedOption}
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "12px" }}>
                <i className="fas fa-chevron-down" style={{ marginLeft: 8 }}></i>

                </span>
              </div>
              {isDropdownOpen && (
                <div className="dropdownMenu" style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ddd", borderRadius: 5, zIndex: 1000 }}>
                  {options.map(opt => (
                    <div key={opt} onClick={() => handleOptionClick(opt)} style={{ padding: 10, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f0f0f0"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
  
          {/* Google Map */}
          <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={zoomLevel}>
            {filteredMapData.map((d, i) => {
              const count = selectedOption === 'All' ? d.total : selectedOption === 'Violation' ? d.violation : d.crash;
              return (
                <MarkerF
                  key={i}
                  position={d.position}
                  label={{ text: String(count), color: "white", fontSize: "12px", fontWeight: "bold" }}
                  icon={{ path: window.google.maps.SymbolPath.CIRCLE, fillColor: "red", fillOpacity: 1, scale: 20, strokeWeight: 0 }}
                />
              );
            })}
          </GoogleMap>
        </div>
  
        {/* Table Container */}
        <div
          style={{
            width: "48%",
            height: "100%",
            background: "#fff",
            borderRadius: "15px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            padding: "0 20px 20px",
            overflow: "hidden",
          }}
        >
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "#FAFAFA", zIndex: 1 }}>
                <tr style={{ color: "#000000E0" }}>
                  <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Neighborhood Name</th>
                  <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Number of Violations</th>
                  <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Number of Crashes</th>
                  <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Total Incidents</th>
                </tr>
              </thead>
              <tbody>
                {districtData.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>Loading data...</td>
                  </tr>
                ) : (
                  districtData.map((d, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>{d.district}</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>{d.violation}</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>{d.crash}</td>
                      <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>{d.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );  
};

export default ViolationCrashGeoChart;
