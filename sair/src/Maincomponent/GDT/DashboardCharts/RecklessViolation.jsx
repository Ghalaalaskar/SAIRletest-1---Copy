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
  Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Tooltip as AntTooltip } from "antd";

// Function to capitalize the first letter of a string
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Custom legend component with tooltips
const CustomLegend = () => {
  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        justifyContent: "center",
        marginBottom: "10px",
      }}
    >
      <AntTooltip title="The driver exceeded the speed limit by 30km/h">
        <span
          style={{ color: "#2E7D32", fontWeight: "bold", cursor: "pointer" }}
        >
          ● Reckless Violation Type 1
        </span>
      </AntTooltip>
      <AntTooltip title="The driver exceeded the speed limit by 50km/h">
        <span
          style={{ color: "#4CAF50", fontWeight: "bold", cursor: "pointer" }}
        >
          ● Reckless Violation Type 2
        </span>
      </AntTooltip>
    </div>
  );
};

const RecklessViolation = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const violationSnapshot = await getDocs(collection(db, "Violation"));
        const driverIDs = new Set();
        const companyCounts = new Map();

        // Collect violation data and group by driverID
        violationSnapshot.forEach((doc) => {
          const { driverID, count30 = 0, count50 = 0 } = doc.data();
          if (driverID) driverIDs.add(driverID);

          if (!companyCounts.has(driverID)) {
            companyCounts.set(driverID, { count30: 0, count50: 0 });
          }
          companyCounts.get(driverID).count30 += count30;
          companyCounts.get(driverID).count50 += count50;
        });

        const driverIDList = [...driverIDs];
        const driverMap = new Map();

        // Fetch company names associated with each driver
        for (let i = 0; i < driverIDList.length; i += 10) {
          const batch = driverIDList.slice(i, i + 10);
          const q = query(
            collection(db, "Driver"),
            where("DriverID", "in", batch)
          );
          const driverSnapshot = await getDocs(q);

          driverSnapshot.forEach((doc) => {
            const { DriverID, CompanyName } = doc.data();
            if (DriverID && CompanyName) {
              driverMap.set(DriverID, CompanyName);
            }
          });
        }

        // Fetch short company names for display purposes
        const employerSnapshot = await getDocs(collection(db, "Employer"));
        const employerMap = new Map();
        employerSnapshot.forEach((doc) => {
          const { CompanyName, ShortCompanyName } = doc.data();
          if (CompanyName && ShortCompanyName) {
            employerMap.set(CompanyName, ShortCompanyName);
          }
        });

        const companyMap = new Map();

        // Aggregate violations by company
        driverMap.forEach((companyName, driverID) => {
          const counts = companyCounts.get(driverID);
          if (counts && (counts.count30 > 0 || counts.count50 > 0)) {
            if (!companyMap.has(companyName)) {
              companyMap.set(companyName, { count30: 0, count50: 0 });
            }
            companyMap.get(companyName).count30 += counts.count30;
            companyMap.get(companyName).count50 += counts.count50;
          }
        });

        let chartData = Array.from(companyMap, ([companyName, counts]) => ({
          name: capitalizeFirstLetter(
            employerMap.get(companyName) || companyName
          ),
          count30: counts.count30,
          count50: counts.count50,
          companyName,
        }));

        // Dummy data
        const dummyData = [];
        chartData = [...chartData, ...dummyData];

        setData(chartData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <CustomLegend />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
  dataKey="name"
  tick={{ dy: 10 }} 
  label={{
    value: "Delivery Companies",
    position: "insideBottom",
    dy: 30, 
  }}
/>


          <YAxis
            allowDecimals={false}
            label={{
              value: "Number of Reckless Violations",
              angle: -90,
              position: "middle",
              dx: -20,
            }}
          />
          <Tooltip />
          <Bar
            dataKey="count30"
            fill="#2E7D32"
            name="Reckless Violation Type 1"
            barSize={80}
            style={{ cursor: "pointer" }}
            onClick={(data) => {
              navigate(`/gdtrecklessviolations/30/${data.payload.companyName}`);
            }}
          />
          <Bar
            dataKey="count50"
            fill="#4CAF50"
            name="Reckless Violation Type 2"
            barSize={80}
            style={{ cursor: "pointer" }}
            onClick={(data) => {
              navigate(`/gdtrecklessviolations/50/${data.payload.companyName}`);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RecklessViolation;
