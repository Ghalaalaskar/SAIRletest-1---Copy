"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
} from "recharts";

const NumberofViolations = ({ dateType, companyName }) => {
  const [data, setData] = useState([]);
  // Hardcoded dummy data for 2025
  const dummyData = [
    // Violations for the past 12 months
    { time: Math.floor(new Date(2025, 0, 1).getTime() / 1000) }, // January
    { time: Math.floor(new Date(2025, 1, 1).getTime() / 1000) }, // February
    { time: Math.floor(new Date(2025, 2, 1).getTime() / 1000) }, // March
    { time: Math.floor(new Date(2025, 3, 1).getTime() / 1000) }, // April
    { time: Math.floor(new Date(2025, 4, 1).getTime() / 1000) }, // May
    { time: Math.floor(new Date(2025, 5, 1).getTime() / 1000) }, // June
    { time: Math.floor(new Date(2025, 6, 1).getTime() / 1000) }, // July
    { time: Math.floor(new Date(2025, 7, 1).getTime() / 1000) }, // August
    { time: Math.floor(new Date(2025, 8, 1).getTime() / 1000) }, // September
    { time: Math.floor(new Date(2025, 9, 1).getTime() / 1000) }, // October
    { time: Math.floor(new Date(2025, 10, 1).getTime() / 1000) }, // November
    { time: Math.floor(new Date(2025, 11, 1).getTime() / 1000) }, // December
    // Violations for the past 7 days
    { time: Math.floor(new Date().getTime() / 1000) }, // Today
    { time: Math.floor(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Yesterday
    { time: Math.floor(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Two days ago
    { time: Math.floor(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Three days ago
    { time: Math.floor(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Four days ago
    { time: Math.floor(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Four days ago
    { time: Math.floor(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Four days ago
    { time: Math.floor(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Five days ago
    { time: Math.floor(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Six days ago
  ];
  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const violationSnapshot = await getDocs(collection(db, "Violation"));
        const driverIDs = new Set();

        violationSnapshot.forEach((doc) => {
          const { driverID } = doc.data();
          if (driverID) driverIDs.add(driverID);
        });

        const driverIDList = [...driverIDs];
        const driverMap = new Map();

        // Fetch drivers in batches
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

        // Fetch all employers to map CompanyName to ShortCompanyName
        const employerSnapshot = await getDocs(collection(db, "Employer"));
        const employerMap = new Map();

        employerSnapshot.forEach((doc) => {
          const { CompanyName, ShortCompanyName } = doc.data();
          if (CompanyName && ShortCompanyName) {
            employerMap.set(CompanyName, ShortCompanyName);
          }
        });

        const violationsMap = new Map();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate;
        if (dateType === "week") {
          startDate = new Date();
          startDate.setDate(today.getDate() - 7); // Last 7 days
        } else { // Month
          startDate = new Date(today.getFullYear(), 0, 1); // Start from January 1st of the current year
        }

        // Initialize the date range for the chart
        const dateRange = [];
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
          const formattedDate = dateType === "week"
            ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
            : d.toLocaleDateString("en-GB", { year: "numeric", month: "long" });
          dateRange.push({ date: formattedDate, count: 0 });
        }

        // Process violations and group by date
        violationSnapshot.forEach((doc) => {
          const { time, driverID } = doc.data();
          if (!time) return;

          const violationDate = new Date(time * 1000);
          violationDate.setHours(0, 0, 0, 0);

          if (violationDate >= startDate && violationDate <= today) {
            const companyNameFromDriver = driverMap.get(driverID);
            const shortName = employerMap.get(companyNameFromDriver) || companyNameFromDriver;

            // Filter by company name if provided
            if (companyName !== "All" && shortName !== companyName) return;

            const formattedDate = dateType === "week"
              ? violationDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
              : violationDate.toLocaleDateString("en-GB", { year: "numeric", month: "long" });

            violationsMap.set(
              formattedDate,
              (violationsMap.get(formattedDate) || 0) + 1
            );
          }
        });

        // Update the date range with actual counts
        dateRange.forEach(({ date }) => {
          if (violationsMap.has(date)) {
            const count = violationsMap.get(date);
            // Set the count for the existing date
            violationsMap.set(date, count);
          } else {
            // Ensure it exists with a count of 0
            violationsMap.set(date, 0);
          }
        });

        // Convert Map to an array and sort it in ascending order
        const chartData = Array.from(violationsMap, ([date, count]) => ({
          date,
          count,
        })).sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending

        console.log("Chart Data:", chartData); // Debugging line
        setData(chartData);
      } catch (error) {
        console.error("Error fetching violations:", error);
      }
    };

    fetchViolations(); // Fetch violations data
  }, [dateType, companyName]); // Add dependencies

  return (
    <div style={{ width: "100%", height: "400px", overflowX: "auto" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
        >
          <defs>
            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            interval={0} // Show all dates
            angle={-45}
            textAnchor="end"
            label={{ value: "Date", position: "insideBottom", dy: 55 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            label={{
              value: "Number of Violations",
              angle: -90,
              position: "middle",
              dx: -20,
            }}
          />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#82ca9d"
            fillOpacity={1}
            fill="url(#colorPv)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NumberofViolations;