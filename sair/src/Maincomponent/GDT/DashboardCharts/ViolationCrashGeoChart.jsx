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
            borderRadius: "15px",
            overflow: "hidden",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            background: "#f4f4f4",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "15px",
            }}
          >
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
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "#FAFAFA",
                  color: "#000000E0",
                  Font: "Open Sans",
                }}
              >
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
                  Neighborhood Name
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  5
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  2
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Downtown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  8
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  3
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Uptown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  5
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  2
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Downtown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  8
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  3
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Uptown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  5
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  2
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Downtown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  8
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  3
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Uptown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  5
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  2
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Downtown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  8
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  3
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Uptown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  5
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  2
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Downtown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  8
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  3
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Uptown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  5
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  2
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Downtown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  8
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  3
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Uptown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  5
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  2
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Downtown
                </td>
              </tr>
              <tr>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  8
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  3
                </td>
                <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                  Uptown
                </td>
              </tr>
              {/* Add more rows here as needed */}
            </tbody>
          </table>
        </div>
      </div>
    </ResponsiveContainer>
  );
};

export default ViolationCrashGeoChart;
