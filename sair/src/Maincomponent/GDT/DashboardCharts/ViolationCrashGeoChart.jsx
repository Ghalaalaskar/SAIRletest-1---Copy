"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, where, query } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Map from "../../Map";
import { GoogleMap } from "@react-google-maps/api";
import { Table } from "antd";

const containerStyle = {
  width: "100%", // Set the map width
  height: "600px", // Set the map height
  margin: "auto", // Center the map
};

const ViolationCrashGeoChart = () => {
  const [data, setData] = useState([]); // Keep the useState here, only once

  const [mapCenter, setMapCenter] = useState({ lat: 24.6986, lng: 46.6853 }); // Default center
  const [zoomLevel, setZoomLevel] = useState(11); // Default zoom level
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

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setDropdownOpen(false);
  };

  // Riyadh Neighborhoods
  const neighborhoods = [
    "Al-Olaya",
    "Al-Malaz",
    "Al-Murabba",
    "Al-Sulimania",
    "Al-Rawdah",
    "Al-Nakheel",
    "Al-Yasmin",
    "Al-Rahmaniyah",
    "Al-Naseem",
    "Al-Wadi",
    "Al-Maathar",
    "Al-Khozama",
    "Al-Selay",
    "Al-Mansour",
    "Al-Maazer",
    "Al-Qirawan",
    "Al-Malga",
    "Al-Nafal",
    "Al-Rawabi",
  ];

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Violation"));
        const violationsMap = new Map();
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

        querySnapshot.forEach((doc) => {
          const { time } = doc.data();
          if (!time) return; // Ensure time exists

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

        // Convert Map to an array and sort by date
        const chartData = Array.from(violationsMap, ([date, count]) => ({
          date,
          count,
        }));

        setData(chartData);
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

        const crashesMap = new Map();
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
          const { time } = doc.data();
          if (!time) return; // Ensure time exists

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

        // Convert Map to an array and sort by date
        const CrashchartData = Array.from(crashesMap, ([date, count]) => ({
          date,
          count,
        }));

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
            ></GoogleMap>
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
                  const violations = Math.floor(Math.random() * 10);
                  const crashes = Math.floor(Math.random() * 5);
                  const totalIncidents = violations + crashes; // Calculate total

                  return (
                    <tr key={index}>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {neighborhood}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {violations}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {crashes}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {totalIncidents} {/* Display calculated total */}
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
