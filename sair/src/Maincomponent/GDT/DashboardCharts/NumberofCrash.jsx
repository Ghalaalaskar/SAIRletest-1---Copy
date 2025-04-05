"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs,query,where } from "firebase/firestore";
import {
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
} from "recharts";

const NumberofCrash  = ({ dateType, companyName }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchCrashes = async () => {
      try {
        const crashSnapshot = await getDocs(collection(db, "Crash"));
        const driverIDs = new Set();

        crashSnapshot.forEach((doc) => {
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

        const crashesMap = new Map();
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

        // Process crashes and group by date
        crashSnapshot.forEach((doc) => {
          const { time, driverID } = doc.data();
          if (!time) return;

          const crashDate = new Date(time * 1000);
          crashDate.setHours(0, 0, 0, 0);

          if (crashDate >= startDate && crashDate <= today) {
            const companyNameFromDriver = driverMap.get(driverID);
            const shortName = employerMap.get(companyNameFromDriver) || companyNameFromDriver;

            // Filter by company name if provided
            if (companyName !== "All" && shortName !== companyName) return;

            const formattedDate = dateType === "week"
              ? crashDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
              : crashDate.toLocaleDateString("en-GB", { year: "numeric", month: "long" });

            crashesMap.set(
              formattedDate,
              (crashesMap.get(formattedDate) || 0) + 1
            );
          }
        });

        // Update the date range with actual counts
        dateRange.forEach(({ date }) => {
          if (crashesMap.has(date)) {
            const count = crashesMap.get(date);
            // Set the count for the existing date
            crashesMap.set(date, count);
          } else {
            // Ensure it exists with a count of 0
            crashesMap.set(date, 0);
          }
        });

        // Convert Map to an array and sort it in ascending order
        const chartData = Array.from(crashesMap, ([date, count]) => ({
          date,
          count,
        })).sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending

        console.log("Chart Data:", chartData); // Debugging line
        setData(chartData);
      } catch (error) {
        console.error("Error fetching crashes:", error);
      }
    };

    fetchCrashes(); // Fetch crashes data
  }, [dateType, companyName]); // Add dependencies


  return (
    <div style={{ width: "100%", height: "400px", overflowX: "auto" }}>
      <ResponsiveContainer width={data.length > 7 ? "150%" : "100%"} height="100%">
        <LineChart
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
              value: "Number of Crashes",
              angle: -90,
              position: "middle",
              dx: -20,
            }}
          />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#82ca9d"
            dot={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NumberofCrash;