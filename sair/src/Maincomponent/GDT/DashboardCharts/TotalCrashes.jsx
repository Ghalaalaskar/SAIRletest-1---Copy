"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";import {
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

const TotalCrash = () => {
  const [data, setData] = useState([]);
  const [totalcrash, setTotalCrash] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
        try {
  
          // Step 1: Fetch violations (get driverIDs)
          const violationSnapshot = await getDocs(collection(db, "Crash"));
          const driverIDs = new Set();
  
          violationSnapshot.forEach((doc) => {
            const { driverID } = doc.data();
            if (driverID) driverIDs.add(driverID);
          });
  
          console.log("Driver IDs from Violations:", [...driverIDs]);
  
          if (driverIDs.size === 0) {
            console.warn("No driverIDs found in Violation collection");
            setData([]);
            return;
          }
  
          // Step 2: Fetch drivers (batch queries to avoid Firestore limit)
          const driverIDList = [...driverIDs];
          const driverMap = new Map();
  
          for (let i = 0; i < driverIDList.length; i += 10) {
            const batch = driverIDList.slice(i, i + 10);
            const q = query(collection(db, "Driver"), where("DriverID", "in", batch));
            const driverSnapshot = await getDocs(q);
  
            driverSnapshot.forEach((doc) => {
              const { DriverID, CompanyName } = doc.data();
              if (DriverID && CompanyName) {
                driverMap.set(DriverID, CompanyName);
              }
            });
          }
  
          console.log("Driver Map (driverID -> CompanyName):", driverMap);
  
          // Step 3: Map violations to CompanyNames
          const companyMap = new Map();
          violationSnapshot.forEach((doc) => {
            const { driverID } = doc.data();
            const companyName = driverMap.get(driverID);
  
            if (companyName) {
              companyMap.set(companyName, (companyMap.get(companyName) || 0) + 1);
            } else {
              console.warn(`No CompanyName found for driverID: ${driverID}`);
            }
          });
  
          console.log("Company Map (CompanyName -> Violation Count):", companyMap);
  // Calculate total number of violations
  const total = Array.from(companyMap.values()).reduce((sum, count) => sum + count, 0);
  setTotalCrash(total);
  
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
            name: capitalizeFirstLetter(employerMap.get(companyName) || companyName),
            value,
          }));
  
          console.log("Final Chart Data:", chartData);
  
          setData(chartData);
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
        }
      };
  
      fetchData();
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
        {totalcrash}
        <div style={{ fontSize: "14px", color: "#666" }}>Total Crashes</div>
      </div>
    </div>
  );
};

export default TotalCrash;
