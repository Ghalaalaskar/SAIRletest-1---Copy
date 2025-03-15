"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
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

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const RecklessViolation = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all violations
        const violationSnapshot = await getDocs(collection(db, "Violation"));
        
        const driverIDs = new Set();
        const companyCounts = new Map();

        violationSnapshot.forEach((doc) => {
          const { driverID, count30 = 0, count50 = 0 } = doc.data();
          if (driverID) driverIDs.add(driverID);
          
          if (!companyCounts.has(driverID)) {
            companyCounts.set(driverID, { count30: 0, count50: 0 });
          }
          companyCounts.get(driverID).count30 += count30;
          companyCounts.get(driverID).count50 += count50;
        });

        // Fetch drivers
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

        // Fetch employers
        const employerSnapshot = await getDocs(collection(db, "Employer"));
        const employerMap = new Map();
        employerSnapshot.forEach((doc) => {
          const { CompanyName, ShortCompanyName } = doc.data();
          if (CompanyName && ShortCompanyName) {
            employerMap.set(CompanyName, ShortCompanyName);
          }
        });

        // Map violations to CompanyNames
        const companyMap = new Map();
        driverMap.forEach((companyName, driverID) => {
          if (!companyMap.has(companyName)) {
            companyMap.set(companyName, { count30: 0, count50: 0 });
          }
          const counts = companyCounts.get(driverID) || { count30: 0, count50: 0 };
          companyMap.get(companyName).count30 += counts.count30;
          companyMap.get(companyName).count50 += counts.count50;
        });

        // Prepare final chart data
        const chartData = Array.from(companyMap, ([companyName, counts]) => ({
          name: capitalizeFirstLetter(employerMap.get(companyName) || companyName),
          count30: counts.count30,
          count50: counts.count50,
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
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" textAnchor="middle" interval={0} height={60} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count30" fill="#2E7D32" name="The driver exceeded the speed limit by 30km/h" />
          <Bar dataKey="count50" fill="#4CAF50" name="The driver exceeded the speed limit by 50km/h" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RecklessViolation;