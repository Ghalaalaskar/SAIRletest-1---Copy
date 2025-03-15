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

const COLORS = ["#2E7D32", "#4CAF50", "#FFC107", "#FF5722", "#03A9F4", "#9C27B0"]; // Different colors for companies

const NumberofDrivers = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Driver"));
        const companyMap = new Map();

        // Count the number of drivers per CompanyName
        querySnapshot.forEach((doc) => {
          const { CompanyName } = doc.data();
          if (CompanyName) {
            companyMap.set(CompanyName, (companyMap.get(CompanyName) || 0) + 1);
          }
        });

        // Convert to array format for Pie Chart
        const chartData = Array.from(companyMap, ([name, value]) => ({ name, value }));

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
            cx="50%"
            cy="50%"
            outerRadius={120}
            label
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NumberofDrivers;
