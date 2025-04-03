"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
} from "recharts";

const NumberofCrash = ({ dateType }) => {
  const [data, setData] = useState([]);

  // Hardcoded dummy data for 2025
  const dummyData = [
    // Crashes for the past 12 months
    { time: Math.floor(new Date(2025, 0, 1).getTime() / 1000) }, // January
    { time: Math.floor(new Date(2025, 1, 1).getTime() / 1000) }, // February
    { time: Math.floor(new Date(2025, 1, 1).getTime() / 1000) }, // February
    { time: Math.floor(new Date(2025, 2, 1).getTime() / 1000) }, // March
    { time: Math.floor(new Date(2025, 3, 1).getTime() / 1000) }, // April
    { time: Math.floor(new Date(2025, 3, 1).getTime() / 1000) }, // April
    { time: Math.floor(new Date(2025, 3, 1).getTime() / 1000) }, // April
    { time: Math.floor(new Date(2025, 3, 1).getTime() / 1000) }, // April

    { time: Math.floor(new Date(2025, 4, 1).getTime() / 1000) }, // May
    { time: Math.floor(new Date(2025, 5, 1).getTime() / 1000) }, // June
    { time: Math.floor(new Date(2025, 6, 1).getTime() / 1000) }, // July
    { time: Math.floor(new Date(2025, 7, 1).getTime() / 1000) }, // August
    { time: Math.floor(new Date(2025, 8, 1).getTime() / 1000) }, // September
    { time: Math.floor(new Date(2025, 9, 1).getTime() / 1000) }, // October
    { time: Math.floor(new Date(2025, 10, 1).getTime() / 1000) }, // November
    { time: Math.floor(new Date(2025, 11, 1).getTime() / 1000) }, // December
    // Crashes for the past 7 days
    { time: Math.floor(new Date().getTime() / 1000) }, // Today
    { time: Math.floor(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Yesterday
    { time: Math.floor(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Yesterday
    { time: Math.floor(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Two days ago
    { time: Math.floor(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Three days ago
    { time: Math.floor(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Four days ago
    { time: Math.floor(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Four days ago
    { time: Math.floor(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Four days ago
    { time: Math.floor(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Five days ago
    { time: Math.floor(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Five days ago
    { time: Math.floor(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Six days ago
    { time: Math.floor(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Six days ago
    { time: Math.floor(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Six days ago
    { time: Math.floor(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).getTime() / 1000) }, // Six days ago
    ];

  useEffect(() => {
    const fetchCrashes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Crash"));
        const crashesMap = new Map();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get the current year and month
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-based index

        // Determine the date range and grouping based on dateType
        let startDate;
        if (dateType === "week") {
          startDate = new Date();
          startDate.setDate(today.getDate() - 7); // Last 7 days
        } else { // Month
          startDate = new Date(currentYear, 0, 1); // Start from January 1st of the current year
        }

        // Initialize map based on dateType
        if (dateType === "week") {
          for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const formattedDate = d.toLocaleDateString("en-GB", { day: "2-digit", month: "long" });
            crashesMap.set(formattedDate, 0);
          }
        } else { // Month
          for (let month = 0; month <= currentMonth; month++) { // Only include passed months
            const formattedDate = new Date(currentYear, month).toLocaleDateString("en-GB", { year: "numeric", month: "long" });
            crashesMap.set(formattedDate, 0);
          }
        }

        // Process crash from Firestore and group by date
        querySnapshot.forEach((doc) => {
          const { time } = doc.data();
          if (!time) return;

          const crashDate = new Date(time * 1000);
          crashDate.setHours(0, 0, 0, 0);

          if (crashDate >= startDate && crashDate <= today) {
            const formattedDate = dateType === "week"
              ? crashDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
              : crashDate.toLocaleDateString("en-GB", { year: "numeric", month: "long" });
            
            crashesMap.set(
              formattedDate,
              (crashesMap.get(formattedDate) || 0) + 1
            );
          }
        });

        // Process dummy data and group by date
        dummyData.forEach((crash) => {
          const crashDate = new Date(crash.time * 1000);
          crashDate.setHours(0, 0, 0, 0);

          if (crashDate >= startDate && crashDate <= today) {
            const formattedDate = dateType === "week"
              ? crashDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long" })
              : crashDate.toLocaleDateString("en-GB", { year: "numeric", month: "long" });

              crashesMap.set(
              formattedDate,
              (crashesMap.get(formattedDate) || 0) + 1
            );
          }
        });

        // Convert Map to an array and sort it in ascending order
        const chartData = Array.from(crashesMap, ([date, count]) => ({
          date,
          count,
        })).sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending

        setData(chartData);
      } catch (error) {
        console.error("Error fetching crashes:", error);
      }
    };

    fetchCrashes(); // Fetch crashes data
  }, [dateType]);


  return (
    <div style={{ width: "100%", height: "400px", overflowX: "auto" }}>
      <ResponsiveContainer width={data.length > 7 ? "150%" : "100%"} height="100%">
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
              value: "Number of Crashes",
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

export default NumberofCrash;