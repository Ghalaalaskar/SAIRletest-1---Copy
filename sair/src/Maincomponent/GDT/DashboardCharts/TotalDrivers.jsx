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
  const [totalDrivers, setTotalDrivers] = useState(0);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const driverSnapshot = await getDocs(collection(db, "Driver"));
        const companyMap = new Map();

        driverSnapshot.forEach((doc) => {
          const { CompanyName } = doc.data();
          if (CompanyName) {
            companyMap.set(CompanyName, (companyMap.get(CompanyName) || 0) + 1);
          }
        });

        const employerSnapshot = await getDocs(collection(db, "Employer"));
        const employerMap = new Map();

        employerSnapshot.forEach((doc) => {
          const { CompanyName, ShortCompanyName } = doc.data();
          if (CompanyName && ShortCompanyName) {
            employerMap.set(CompanyName, ShortCompanyName);
          }
        });

        const chartData = Array.from(companyMap, ([companyName, value]) => ({
          name: capitalizeFirstLetter(employerMap.get(companyName) || companyName),
          value,
        }));

        setData(chartData);
        setTotalDrivers(chartData.reduce((sum, entry) => sum + entry.value, 0)); // Calculate total count
      } catch (error) {
        console.error("Error fetching drivers:", error);
      }
    };

    fetchDrivers();
  }, []);

  return (
    <div style={{ width: "100%", height: "400px", position: "relative" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
         data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={80} // Creates the donut effect
            outerRadius={120}
            labelLine={false} // Removes label lines
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} // Custom labels
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend layout="horizontal" verticalAlign="buttom" />
        </PieChart>
      </ResponsiveContainer>

      {/* Centered Total Count */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "28px",
          fontWeight: "bold",
          color: "#333",
          textAlign: "center",
        }}
      >
        {totalDrivers}
        <div style={{ fontSize: "14px", color: "#666" }}>Total Drivers</div>
      </div>
    </div>
  );
};

export default NumberofDrivers;
