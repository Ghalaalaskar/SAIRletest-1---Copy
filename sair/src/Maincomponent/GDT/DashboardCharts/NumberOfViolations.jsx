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

const NumberofViolations = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Violation"));
        const violationsMap = new Map();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        querySnapshot.forEach((doc) => {
          const { time } = doc.data();
          if (!time) return; // Ensure time exists
          
          const violationDate = new Date(time * 1000); // Convert Unix timestamp
          violationDate.setHours(0, 0, 0, 0); // Normalize to start of day

          if (violationDate >= oneWeekAgo) {
            const formattedDate = violationDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }); // Format: '12 Feb'

            // Count the number of violations per date
            violationsMap.set(
              formattedDate,
              (violationsMap.get(formattedDate) || 0) + 1
            );
          }
        });

        // Convert Map to an array of objects suitable for Recharts
        const chartData = Array.from(violationsMap, ([name, count]) => ({
          name,
          count,
        }));
        
        setData(chartData);
      } catch (error) {
        console.error("Error fetching violations:", error);
      }
    };

    fetchViolations();
  }, []);

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} width={500} height={300} margin={{ right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} label={{ value: "Number of Violations", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#2E7D32" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NumberofViolations;
