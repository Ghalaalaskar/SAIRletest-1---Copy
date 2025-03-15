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

const NumberofViolation = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Step 1: Fetch violations (get driverIDs)
        const violationSnapshot = await getDocs(collection(db, "Violation"));
        const driverIDs = new Set();

        violationSnapshot.forEach((doc) => {
          const { driverID } = doc.data();
          if (driverID) driverIDs.add(driverID);
        });

        // Step 2: Fetch drivers (get CompanyName based on driverID)
        const driverSnapshot = await getDocs(collection(db, "Driver"));
        const driverMap = new Map();

        driverSnapshot.forEach((doc) => {
          const { driverID, CompanyName } = doc.data();
          if (driverID && CompanyName) {
            driverMap.set(driverID, CompanyName);
          }
        });

        // Step 3: Map violations to CompanyNames
        const companyMap = new Map();
        violationSnapshot.forEach((doc) => {
          const { driverID } = doc.data();
          const companyName = driverMap.get(driverID);
          if (companyName) {
            companyMap.set(companyName, (companyMap.get(companyName) || 0) + 1);
          }
        });

        // Step 4: Fetch employers (map CompanyName to ShortCompanyName)
        const employerSnapshot = await getDocs(collection(db, "Employer"));
        const employerMap = new Map();

        employerSnapshot.forEach((doc) => {
          const { CompanyName, ShortCompanyName } = doc.data();
          if (CompanyName && ShortCompanyName) {
            employerMap.set(CompanyName, ShortCompanyName);
          }
        });

        // Step 5: Prepare final chart data with ShortCompanyName
        const chartData = Array.from(companyMap, ([companyName, value]) => ({
          name: capitalizeFirstLetter(employerMap.get(companyName) || companyName), // Use ShortCompanyName if available
          value,
        }));

        setData(chartData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

    return (
        <div style={{ width: "100%", height: "400px" }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="40%"
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
          ) : (
            <p>Loading chart...</p>
          )}
        </div>
      );
      
  
};

export default NumberofViolation;
