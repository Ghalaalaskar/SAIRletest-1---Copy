"use client";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
  defs,
  linearGradient,
  stop,
} from "recharts";

const StaffChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchCrashes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Crash"));
        const crashesMap = new Map();

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Initialize map with all dates in the past week
        for (let d = new Date(oneWeekAgo); d <= today; d.setDate(d.getDate() + 1)) {
          const formattedDate = d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
          });
          crashesMap.set(formattedDate, { total: 0, unresponded: 0 });
        }

        querySnapshot.forEach((doc) => {
          const { time, RespondedBy } = doc.data();
          if (!time) return;

          const crashDate = new Date(time * 1000);
          crashDate.setHours(0, 0, 0, 0);

          if (crashDate >= oneWeekAgo) {
            const formattedDate = crashDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
            });

            const prevData = crashesMap.get(formattedDate) || { total: 0, unresponded: 0 };
            crashesMap.set(formattedDate, {
              total: prevData.total + 1,
              unresponded: prevData.unresponded + (RespondedBy ? 0 : 1),
            });
          }
        });

        // Convert Map to an array
        const chartData = Array.from(crashesMap, ([date, { total, unresponded }]) => ({
          date,
          total,
          unresponded,
        }));

        setData(chartData);
      } catch (error) {
        console.error("Error fetching crashes:", error);
      }
    };

    fetchCrashes();
  }, []);

  return (
    <div style={{ width: "100%", height: "400px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorUnresponded" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000000" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#000000" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="date"
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            label={{ value: "Date", position: "insideBottom", dy: 55 }}
          />
          <YAxis
            allowDecimals={false}
            label={{ value: "Number of Crashes", angle: -90, position: "middle", dx: -20 }}
          />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip />
          <Legend layout="horizontal" align="right" verticalAlign="top" />

          {/* Total Crashes - Green */}
          <Area
            type="monotone"
            dataKey="total"
            stroke="#2E7D32"
            fillOpacity={1}
            fill="url(#colorTotal)"
            name="Total Crashes"
          />

          {/* Unresponded Crashes - Black */}
          <Area
            type="monotone"
            dataKey="unresponded"
            stroke="#000000"
            fillOpacity={1}
            fill="url(#colorUnresponded)"
            name="Unresponded Crashes"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StaffChart;
