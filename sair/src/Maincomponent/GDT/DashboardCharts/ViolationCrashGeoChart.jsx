
import { useEffect, useRef, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, where, query } from "firebase/firestore";
import {
  ResponsiveContainer,
} from "recharts";
// import Map from "../../Map";
import { GoogleMap, MarkerF } from "@react-google-maps/api";

const containerStyle = {
  width: "100%", // Set the map width
  height: "600px", // Set the map height
  margin: "auto", // Center the map
};

const ViolationCrashGeoChart = () => {
  const [data, setData] = useState([]); // Keep the useState here, only once

  const [mapCenter, setMapCenter] = useState({ lat: 24.6986, lng: 46.6853 }); // Default center
  const [zoomLevel, setZoomLevel] = useState(11); // Default zoom level
  const [violationsData, setViolationsData] = useState([])
  const [crashesData, setCrashesData] = useState([])
  const [enrichedViolationsData, setEnrichedViolationsData] = useState([]);
  const handleMapLoad = (mapInstance) => {
    mapInstance.addListener("zoom_changed", () => {
      setZoomLevel(mapInstance.getZoom());
    });
  };
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("All");

  const options = ["All", "Violation", "Crash"];

  const toggleDropdown = () => {
    setDropdownOpen(!isDropdownOpen);
  };

  const getAddressFromCoordinates = async (lat, lng) => {
    return new Promise((resolve, reject) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results[0]) {
          // Extract just the city name from address components
          let cityName = "";
          for (const component of results[0].address_components) {
            // Look for locality (city) or sublocality (district/neighborhood)
            if (component.types.includes("locality") ||
              component.types.includes("sublocality") ||
              component.types.includes("administrative_area_level_3")) {
              cityName = component.long_name;
              break;
            }
          }
          resolve(cityName || "Unknown city");
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  };


  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setDropdownOpen(false);
  };

  // Riyadh Neighborhoods
  const neighborhoods = [
    "Al Hamra"
  ];

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Violation"));
        const violationsMap = new window.Map();
        const allViolations = [];
    
        querySnapshot.forEach((doc) => {
          const { time } = doc.data();
          const dataValue = doc.data();
          if (!time) return;
    
          allViolations.push(dataValue);
    
          const violationDate = new Date(time * 1000);
          violationDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
          const formattedDate = violationDate.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric", // Add year if you expect long-term data
          });
    
          violationsMap.set(
            formattedDate,
            (violationsMap.get(formattedDate) || 0) + 1
          );
        });
    
        const chartData = Array.from(violationsMap, ([date, count]) => ({
          date,
          count,
        }));
    
        setViolationsData(chartData);
        setData(chartData);
    
        const enrichData = async () => {
          try {
            const enrichedData = await Promise.all(
              allViolations.map(async (violation) => {
                if (violation.position && !violation.formattedAddress) {
                  try {
                    let formattedAddress = violation.location || "";
                    if (!formattedAddress && violation.position.latitude && violation.position.longitude) {
                      formattedAddress = await getAddressFromCoordinates(
                        violation.position.latitude,
                        violation.position.longitude
                      );
                    }
                    return {
                      ...violation,
                      formattedAddress
                    };
                  } catch (error) {
                    console.error("Error geocoding address:", error);
                    return {
                      ...violation,
                      formattedAddress: "Address could not be determined"
                    };
                  }
                }
                return violation;
              })
            );
    
            setEnrichedViolationsData(enrichedData);
          } catch (error) {
            console.error("Error enriching data:", error);
          }
        };
    
        enrichData();
    
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
        const allCrashes = [];
    
        querySnapshot.forEach((doc) => {
          const { time } = doc.data();
          const dataValue = doc.data();
          if (!time) return;
    
          allCrashes.push(dataValue);
    
          const crashDate = new Date(time * 1000);
          crashDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
          const formattedDate = crashDate.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric", // Include year for clarity over long time range
          });
    
          crashesMap.set(
            formattedDate,
            (crashesMap.get(formattedDate) || 0) + 1
          );
        });
    
        const CrashchartData = Array.from(crashesMap, ([date, count]) => ({
          date,
          count,
        }));
    
        setCrashesData(CrashchartData);
        setData(CrashchartData);
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
              <MarkerF
                position={{ lat: 24.7783, lng: 46.7614 }}
                label={{
                  text: String(violationsData.length + crashesData.length),
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: "red",
                  fillOpacity: 1,
                  strokeWeight: 0,
                  // scale is in pixels—100 is huge! try ~10 for a 20px diameter
                  scale: 20,
                }}
              />
            </GoogleMap>
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
                {neighborhoods.map((neighborhood, index) => {
                  return (
                    <tr key={index}>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        Al Hamra
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {violationsData.length}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {crashesData.length}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {violationsData.length + crashesData.length} {/* Display calculated total */}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
};

export default ViolationCrashGeoChart;
