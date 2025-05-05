import { useEffect, useRef, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, where, query } from "firebase/firestore";
import { ResponsiveContainer } from "recharts";
// import Map from "../../Map";
import { GoogleMap, MarkerF } from "@react-google-maps/api";

const containerStyle = {
  width: "100%", // Set the map width
  height: "600px", // Set the map height
  margin: "auto", // Center the map
};

const ViolationCrashGeoChart = () => {
  const [data, setData] = useState([]); // Keep the useState here, only once
  const [position, setPosition] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 24.6986, lng: 46.6853 }); // Default center
  const [zoomLevel, setZoomLevel] = useState(11); // Default zoom level
  const handleMapLoad = (mapInstance) => {
    mapInstance.addListener("zoom_changed", () => {
      setZoomLevel(mapInstance.getZoom());
    });
  };
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("All");
  const [mergedDatas, setMergedData] = useState({})


  const options = ["All", "Violation", "Crash"];

  const toggleDropdown = () => {
    setDropdownOpen(!isDropdownOpen);
  };

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setDropdownOpen(false);
  };

  function getDistrictFromCoords(lat, lng) {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps) {
        return reject('Google Maps JS API is not loaded.');
      }

      const geocoder = new window.google.maps.Geocoder();
      const latlng = { lat, lng };

      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results.length > 0) {
          for (const result of results) {
            for (const component of result.address_components) {
              if (
                component.types.includes("sublocality") ||
                component.types.includes("neighborhood")
              ) {
                return resolve(component.long_name); // district name only
              }
            }
          }

          // Fallback if no sublocality or neighborhood found
          resolve("District not found");
        } else {
          reject(`Geocoder failed due to: ${status}`);
        }
      });
    });
  }


  // Riyadh Neighborhoods
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    let districtCrashCount;
    let districtVoliationCount;
    const allViolations = [];
    const allCrashes = [];
    const allPositionVolation = [];
    const allPositionCrashes = [];

    const fetchViolations = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Violation"));
        const violationsMap = new window.Map();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Initialize map with all dates in the past week
        for (
          let d = new Date(oneWeekAgo);
          d <= today;
          d.setDate(d.getDate() + 1)
        ) {
          const formattedDate = d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
          });
          violationsMap.set(formattedDate, 0);
        }

        const allPosition = [];


        querySnapshot.forEach((doc) => {
          const { time, position } = doc.data();
          if (!time) return; // Ensure time exists

          allViolations.push(position);
          allPositionVolation.push({ lat: position.latitude, lng: position.longitude });

          const violationDate = new Date(time * 1000); // Convert Unix timestamp
          violationDate.setHours(0, 0, 0, 0); // Normalize to start of day

          if (violationDate >= oneWeekAgo) {
            const formattedDate = violationDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
            });
            violationsMap.set(
              formattedDate,
              (violationsMap.get(formattedDate) || 0) + 1
            );
          }
        });

        const DistrictResults = [];


        for (let i = 0; i < allViolations.length; i++) {
          const { latitude, longitude } = allViolations[i];
          try {
            const district = await getDistrictFromCoords(latitude, longitude);
            DistrictResults.push(district);
          } catch (error) {
            DistrictResults.push('Error: ' + error);
          }

          // Wait 200ms between requests to avoid rate-limiting
          await sleep(200);
        }
        districtVoliationCount = DistrictResults.reduce((acc, district) => {
          acc[district] = (acc[district] || 0) + 1;
          return acc;
        }, {});

        console.log(allPosition, "allPosition Voliation")
        // setPosition(allPosition);
      } catch (error) {
        console.error("Error fetching violations:", error);
      }
    };

    const fetchCrashes = async () => {
      try {
        const q = query(
          collection(db, "Crash"),
          where("Status", "==", "Emergency SOS")
        );
        const querySnapshot = await getDocs(q);

        const crashesMap = new window.Map();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Initialize map with all dates in the past week
        for (
          let d = new Date(oneWeekAgo);
          d <= today;
          d.setDate(d.getDate() + 1)
        ) {
          const formattedDate = d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
          });
          crashesMap.set(formattedDate, 0);
        }


        querySnapshot.forEach((doc) => {
          const { time, position } = doc.data();
          if (!time) return; // Ensure time exists

          allCrashes.push(position);
          allPositionCrashes.push({ lat: position.latitude, lng: position.longitude });

          const crashDate = new Date(time * 1000); // Convert Unix timestamp
          crashDate.setHours(0, 0, 0, 0); // Normalize to start of day

          if (crashDate >= oneWeekAgo) {
            const formattedDate = crashDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
            });
            crashesMap.set(
              formattedDate,
              (crashesMap.get(formattedDate) || 0) + 1
            );
          }
        });

        console.log(allPositionVolation, "Result allPosition Voliation")
        console.log(allPositionCrashes, "Result allPosition Crashes")


        const combined = [...allPositionVolation, ...allPositionCrashes];

        const map = new Map();

        combined.forEach(({ lat, lng }) => {
          const key = `${lat},${lng}`;
          if (map.has(key)) {
            map.get(key).total += 1;
          } else {
            map.set(key, {
              position: { lat, lng },
              total: 1,
            });
          }
        });

        const result = Array.from(map.values());
        setPosition(result)
        console.log(result, "Result");

        const DistrictResults = [];

        for (let i = 0; i < allCrashes.length; i++) {
          const { latitude, longitude } = allCrashes[i];
          try {
            const district = await getDistrictFromCoords(latitude, longitude);
            DistrictResults.push(district);
          } catch (error) {
            DistrictResults.push('Error: ' + error);
          }

          // Wait 200ms between requests to avoid rate-limiting
          await sleep(200);
        }


        districtCrashCount = DistrictResults.reduce((acc, district) => {
          acc[district] = (acc[district] || 0) + 1;
          return acc;
        }, {});

        const allDistricts = new Set([...Object.keys(districtCrashCount), ...Object.keys(districtVoliationCount)]);

        const mergedData = {};
        for (const district of allDistricts) {
          mergedData[district] = {
            crash: districtCrashCount[district] || 0,
            violation: districtVoliationCount[district] || 0
          };
        }


        setMergedData(mergedData)
      } catch (error) {
        console.error("Error fetching crash:", error);
      }
    };



    fetchCrashes();
    fetchViolations();
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <div
        style={{
          width: "100%",
          height: "400px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
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
          {/* Dropdown Filter Container */}
          <div
            className="searchContainer"
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 10,
            }}
          >
            <div
              className="selectWrapper"
              style={{
                border: "2px solid #4CAF50",
                backgroundColor: "#FFFFFF",
                color: "black",
                borderRadius: "5px",
                padding: "5px",
                fontWeight: "normal",
              }}
            >
              <div
                className={`customSelect ${isDropdownOpen ? "open" : ""}`}
                onClick={toggleDropdown}
                style={{
                  cursor: "pointer",
                  padding: "5px 10px",
                  position: "relative",
                  width: "200px",
                  textAlign: "left",
                }}
              >
                {selectedOption === "All" ? (
                  <span>Filter by Incident Type</span>
                ) : (
                  selectedOption
                )}
                <span
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "solid #4CAF50",
                    borderWidth: "0 2px 2px 0",
                    display: "inline-block",
                    padding: "3px",
                    transform: isDropdownOpen
                      ? "translateY(-50%) rotate(-135deg)"
                      : "translateY(-50%) rotate(45deg)",
                  }}
                />
              </div>
              {isDropdownOpen && (
                <div
                  className="dropdownMenu"
                  style={{
                    position: "absolute",
                    zIndex: 1000,
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    top: "100%",
                    left: "0",
                    right: "0",
                    textAlign: "left",
                    borderRadius: "5px",
                    fontWeight: "normal",
                  }}
                >
                  {options.map((option) => (
                    <div
                      key={option}
                      className="dropdownOption"
                      onClick={() => handleOptionClick(option)}
                      style={{
                        padding: "10px",
                        cursor: "pointer",
                        transition: "background-color 0.3s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f0f0f0")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Google Map */}
          <div style={{ width: "100%", height: "100%", borderRadius: "15px" }}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={zoomLevel}
              onLoad={handleMapLoad}
            >
              {position.map((p, i) => (
                <MarkerF
                  key={i}
                  position={p.position}
                  label={{
                    text: String(p.total),
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: "red",
                    fillOpacity: 1,
                    strokeWeight: 0,
                    scale: 20,
                  }}
                />
              ))}
            </GoogleMap>
            {/*  */}
          </div>
        </div>

        {/* Table Container */}
        <div
          style={{
            width: "48%",
            height: "100%",
            background: "#ffffff",
            borderRadius: "15px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            padding: "0 20px 20px 20px",
            overflow: "hidden", // Prevent overflow on outer div
          }}
        >
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#FAFAFA",
                  zIndex: 1,
                }}
              >
                <tr style={{ color: "#000000E0" }}>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Neighborhood Name
                  </th>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Number of Violations
                  </th>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Number of Crashes
                  </th>
                  <th
                    style={{
                      padding: "10px",
                      textAlign: "left",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Total Incidents
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(mergedDatas).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>
                      {/* Replace this with your loading spinner if you have one */}
                      <span>Loading data...</span>
                    </td>
                  </tr>
                ) : (
                  Object.entries(mergedDatas).map(([district, data], index) => (
                    <tr key={index}>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {district}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {data.violation}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {data.crash}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {data.violation + data.crash}
                      </td>
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
