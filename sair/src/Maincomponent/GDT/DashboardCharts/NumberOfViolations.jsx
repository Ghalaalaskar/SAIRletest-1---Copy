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
      const querySnapshot = await getDocs(collection(db, "Violation"));
      const violationsMap = new Map();

      querySnapshot.forEach((doc) => {
        const { time } = doc.data();
        const formattedTime = new Date(time * 1000).toLocaleTimeString(); // Convert Unix timestamp

        // Count the number of violations per time slot
        violationsMap.set(
          formattedTime,
          (violationsMap.get(formattedTime) || 0) + 1
        );
      });

      // Convert Map to an array of objects suitable for Recharts
      const chartData = Array.from(violationsMap, ([name, count]) => ({
        name,
        count,
      }));

      setData(chartData);
    };

    fetchViolations();
  }, []);

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} width={500} height={300} margin={{ right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NumberofViolations;
