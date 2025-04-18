"use client";
import { useEffect, useState, useRef } from "react";
import { Modal, Button } from "antd";
import { db } from "../../../firebase";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, where, query } from "firebase/firestore";
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
import { Tooltip as AntTooltip } from "antd";

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
      <AntTooltip title="Number of Crach Response for this Staff">
        <span
          style={{ color: "#2E7D32", fontWeight: "bold", cursor: "pointer" }}
        >
          ● Staff Crach Response
        </span>
      </AntTooltip>
      <AntTooltip title="Number of Complaint Response for this Staff">
        <span
          style={{ color: "#4CAF50", fontWeight: "bold", cursor: "pointer" }}
        >
          ● Staff Complaint Response
        </span>
      </AntTooltip>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "white",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "5px",
          boxShadow: "0px 0px 5px rgba(0,0,0,0.2)",
        }}
      >
        <p style={{ fontWeight: "bold", marginBottom: "5px" }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, margin: 0 }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StaffChart = () => {
  const [data, setData] = useState([]);
  const [tooltipData, setTooltipData] = useState(null); // tooltip state
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveringTooltip, setHoveringTooltip] = useState(false);
  const navigate = useNavigate();
  const [crashModalVisible, setCrashModalVisible] = useState(false);
  const [complaintModalVisible, setComplaintModalVisible] = useState(false);
  const [staffNameWithNoComplaint, setStaffNameWithNoComplaint] = useState("");
  const [staffNameWithNoCrash, setStaffNameWithNoCrash] = useState("");

  const chartContainerRef = useRef(null);
  const maxVisibleBars = 5; // Show up to 5 bars before scrolling
  const barWidth = 150; // Fixed width per bar

  useEffect(() => {
    const fetchResponse = async () => {
      try {
        const crashQuery = query(
          collection(db, "Crash"),
          where("Status", "==", "Emergency SOS")
        );
        const CrashQuerySnapshot = await getDocs(crashQuery);
  
        const complaintQuery = query(collection(db, "Complaint"));
        const ComplaintQuerySnapshot = await getDocs(complaintQuery);
  
        const StaffCounts = new Map();
  
        // Count crash responses only if RespondedBy is not null
        CrashQuerySnapshot.forEach((doc) => {
          const { RespondedBy } = doc.data();
          if (RespondedBy) {
            if (!StaffCounts.has(RespondedBy)) {
              StaffCounts.set(RespondedBy, {
                countCrash: 0,
                countComplaint: 0,
              });
            }
            StaffCounts.get(RespondedBy).countCrash += 1;
          }
        });
  
        // Count complaint responses only if RespondedBy is not null
        ComplaintQuerySnapshot.forEach((doc) => {
          const { RespondedBy } = doc.data();
          if (RespondedBy) {
            if (!StaffCounts.has(RespondedBy)) {
              StaffCounts.set(RespondedBy, {
                countCrash: 0,
                countComplaint: 0,
              });
            }
            StaffCounts.get(RespondedBy).countComplaint += 1;
          }
        });
  
        // Fetch staff names for each unique GDTID
        const staffData = await Promise.all(
          Array.from(StaffCounts.keys()).map(async (GDTID) => {
            const gdtQuery = query(
              collection(db, "GDT"),
              where("ID", "==", GDTID)
            );
            const gdtDocs = await getDocs(gdtQuery);
  
            let firstName = "";
            let StaffID = "";
            if (!gdtDocs.empty) {
              firstName = gdtDocs.docs[0].data().Fname || "";
              StaffID = gdtDocs.docs[0].data().ID || "";
            }
  
            return {
              FirstName: firstName,
              GDTID: StaffID,
              Crash: StaffCounts.get(GDTID).countCrash,
              Complaint: StaffCounts.get(GDTID).countComplaint,
            };
          })
        );
  
        setData(staffData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
  
    fetchResponse();
  }, []);  

  // Determine whether scrolling is needed
  const BAR_WIDTH = 100; // Width per bar (adjust as needed)
  const MIN_VISIBLE_BARS = 5;
  const needsScroll = data.length > MIN_VISIBLE_BARS;
  const dynamicWidth = needsScroll ? data.length * BAR_WIDTH : "100%";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Alert when complaint count =0 */}
      <Modal
        title="No Complaints Found"
        open={complaintModalVisible}
        onCancel={() => setComplaintModalVisible(false)}
        centered
        style={{ top: "1%" }}
        className="custom-modal"
        closeIcon={<span className="custom-modal-close-icon">×</span>}
        footer={[
          <Button key="cancel" onClick={() => setComplaintModalVisible(false)}>
            OK
          </Button>,
        ]}
      >
        <p>
          <strong>{staffNameWithNoComplaint}</strong>, the staff member, has not
          responded to any complaints yet.
        </p>
      </Modal>

      {/* Alert when crash count =0 */}
      <Modal
        title="No Crash Found"
        open={crashModalVisible}
        onCancel={() => setCrashModalVisible(false)}
        centered
        style={{ top: "1%" }}
        className="custom-modal"
        closeIcon={<span className="custom-modal-close-icon">×</span>}
        footer={[
          <Button key="cancel" onClick={() => setCrashModalVisible(false)}>
            OK
          </Button>,
        ]}
      >
        <p>
          <strong>{staffNameWithNoCrash}</strong>, the staff member, has not
          responded to any crash yet.
        </p>
      </Modal>

      <CustomLegend />
      <div style={{ overflowX: "auto", whiteSpace: "nowrap" }}>
        {/* <div style={{ width: `${data.length}px` }}> */}
        {data.length <= 7 ? (
          // For small datasets — no scroll, fixed width
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              onMouseLeave={() => {
                if (!hoveringTooltip) setTooltipData(null);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="FirstName"
                interval={0}
                height={60}
                tick={{ dy: 10 }}
                label={{
                  value: "Staff Name",
                  position: "insideBottom",
                  dy: 25,
                }}
              />
              <YAxis
                allowDecimals={false}
                label={{
                  value: "Number of Responses",
                  angle: -90,
                  position: "middle",
                  dx: -20,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="Crash"
                fill="#2E7D32"
                name="Number of Crash Responses"
                style={{ cursor: "pointer" }}
                onClick={(data) => {
                  if (data.payload.Crash === 0) {
                    setStaffNameWithNoCrash(data.payload.FirstName);
                    setCrashModalVisible(true);
                  } else {
                    navigate(`/GDTcrashes/${data.payload.GDTID}`);
                  }
                }}
              />

              <Bar
                dataKey="Complaint"
                fill="#4CAF50"
                name="Number of Complaint Responses"
                style={{ cursor: "pointer" }}
                onClick={(data) => {
                  if (data.payload.Complaint === 0) {
                    setStaffNameWithNoComplaint(data.payload.FirstName);
                    setComplaintModalVisible(true);
                  } else {
                    navigate(`/GDTComplaints/${data.payload.GDTID}`);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          // For large datasets — scrollable, dynamic width
          <div style={{ width: `${data.length}px` }}>
            <BarChart
              width={data.length * 150}
              height={450}
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              onMouseLeave={() => {
                if (!hoveringTooltip) setTooltipData(null);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="FirstName"
                
                interval={0}
                height={60}
                tick={{ dy: 10 }}
                label={{
                  value: "Staff Name",
                  position: "insideBottom",
                  dy: 25,
                }}
              />
              <YAxis
                allowDecimals={false}
                label={{
                  value: "Number of Responses",
                  angle: -90,
                  position: "middle",
                  dx: -20,
                }}
              />
              <Bar
                dataKey="Crash"
                fill="#2E7D32"
                name="Number of Crash Responses"
                style={{ cursor: "pointer" }}
                onClick={(data) => {
                  if (data.payload.Crash === 0) {
                    setStaffNameWithNoCrash(data.payload.FirstName);
                    setCrashModalVisible(true);
                  } else {
                    navigate(`/GDTcrashes/${data.payload.GDTID}`);
                  }
                }}
              />

              <Bar
                dataKey="Complaint"
                fill="#4CAF50"
                name="Number of Complaint Responses"
                style={{ cursor: "pointer" }}
                onClick={(data) => {
                  if (data.payload.Complaint === 0) {
                    setStaffNameWithNoComplaint(data.payload.FirstName);
                    setComplaintModalVisible(true);
                  } else {
                    navigate(`/GDTComplaints/${data.payload.GDTID}`);
                  }
                }}
              />
            </BarChart>
          </div>
        )}
      </div>

      {tooltipData && (
        <div
          onMouseEnter={() => setHoveringTooltip(true)}
          onMouseLeave={() => {
            setHoveringTooltip(false);
            setTooltipData(null);
          }}
          style={{
            position: "absolute",
            left: tooltipPos.x + 60,
            top: tooltipPos.y,
            backgroundColor: "white",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
            boxShadow: "0px 0px 5px rgba(0,0,0,0.2)",
            zIndex: 10,
          }}
        >
          <p style={{ fontWeight: "bold", marginBottom: "5px" }}>
            {tooltipData.label}
          </p>
          {tooltipData.payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: 0 }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffChart;
