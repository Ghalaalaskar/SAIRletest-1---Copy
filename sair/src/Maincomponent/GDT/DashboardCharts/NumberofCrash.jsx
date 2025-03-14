"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
} from "recharts";

const NumberofCrashes = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchCrashes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Crash"));
        const violationsMap = new Map();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Initialize map with all dates in the past week
        for (
          let d = new Date(oneWeekAgo);
          d <= today;
          d.setDate(d.getDate() + 1)
        ) {
          const formattedDate = d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
          });
          violationsMap.set(formattedDate, 0);
        }

        querySnapshot.forEach((doc) => {
          const { time } = doc.data();
          if (!time) return; // Ensure time exists

          const violationDate = new Date(time * 1000); // Convert Unix timestamp
          violationDate.setHours(0, 0, 0, 0); // Normalize to start of day

          if (violationDate >= oneWeekAgo) {
            const formattedDate = violationDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
            });
            violationsMap.set(
              formattedDate,
              (violationsMap.get(formattedDate) || 0) + 1
            );
          }
        });

        // Convert Map to an array and sort by date
        const chartData = Array.from(violationsMap, ([date, count]) => ({
          date,
          count,
        }));

        setData(chartData);
      } catch (error) {
        console.error("Error fetching violations:", error);
      }
    };

    fetchCrashes();
  }, []);

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          width={500}
          height={300}
          margin={{ bottom: 60, right: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="date"
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            label={{ value: "Date", position: "insideBottom", dy: 55 }}
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

          <Tooltip />

          <Line type="monotone" dataKey="count" stroke="#2E7D32" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NumberofCrashes;
