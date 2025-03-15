"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Legend,
  Tooltip,
  Cell,
} from "recharts";

const COLORS = ["#2E7D32", "#4CAF50", "#FFC107", "#FF5722", "#03A9F4", "#9C27B0"]; // Colors for companies

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const NumberofDrivers = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        // Fetch drivers
        const driverSnapshot = await getDocs(collection(db, "Driver"));
        const companyMap = new Map();

        // Count drivers per CompanyName
        driverSnapshot.forEach((doc) => {
          const { CompanyName } = doc.data();
          if (CompanyName) {
            companyMap.set(CompanyName, (companyMap.get(CompanyName) || 0) + 1);
          }
        });

        // Fetch employers to map CompanyName to ShortCompanyName
        const employerSnapshot = await getDocs(collection(db, "Employer"));
        const employerMap = new Map();

        employerSnapshot.forEach((doc) => {
          const { CompanyName, ShortCompanyName } = doc.data();
          if (CompanyName && ShortCompanyName) {
            employerMap.set(CompanyName, ShortCompanyName);
          }
        });

        // Convert to array format for Pie Chart with capitalized ShortCompanyName
        const chartData = Array.from(companyMap, ([companyName, value]) => ({
          name: capitalizeFirstLetter(employerMap.get(companyName) || companyName), // Capitalize ShortCompanyName
          value,
        }));

        setData(chartData);
      } catch (error) {
        console.error("Error fetching drivers:", error);
      }
    };

    fetchDrivers();
  }, []);

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="40%" // Moves pie to the left for space for legend
            cy="50%"
            outerRadius={120}
            label
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend layout="vertical" align="right" verticalAlign="middle" /> 
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NumberofDrivers;
