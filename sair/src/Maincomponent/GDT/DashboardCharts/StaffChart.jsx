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
        const CrashQuerySnapshot = await getDocs(
          collection(db, "Crash"),
          where("Status", "==", "Emergency SOS")
        );
        const ComplaintQuerySnapshot = await getDocs(
          collection(db, "Complaint")
        );
        const StaffCounts = new Map();

        //count crash response
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

        //count complaint response
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

        // Get GDT (Staff) first names from Firestore
        const staffData = await Promise.all(
          Array.from(StaffCounts.keys()).map(async (GDTID) => {
            const gdtQuery = query(
              collection(db, "GDT"),
              where("ID", "==", GDTID)
            ); // Match ID field
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
        // Convert map values to array and update state
        setData(staffData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchResponse();
  }, []);

  // Determine whether scrolling is needed
  const needsScroll = data.length > maxVisibleBars;
  const dynamicWidth = needsScroll ? data.length * barWidth : "100%";

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
        <p><strong>{staffNameWithNoComplaint}</strong>, the staff member, has not responded to any complaints yet.</p>
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
        <p><strong>{staffNameWithNoCrash}</strong>, the staff member, has not responded to any crash yet.</p>
      </Modal>

      <CustomLegend />
      <div
        ref={chartContainerRef}
        style={{
          overflowX: needsScroll ? "auto" : "hidden",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ width: dynamicWidth }}>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
              onMouseLeave={() => {
                if (!hoveringTooltip) setTooltipData(null);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="FirstName" interval={0} height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label, coordinate }) => {
                  if (active && payload && coordinate) {
                    setTooltipData({ label, payload });
                    setTooltipPos({ x: coordinate.x, y: coordinate.y });
                  } else if (!hoveringTooltip) {
                    setTooltipData(null);
                  }
                  return null; // Don't show default tooltip
                }}
              />
              <Bar
                dataKey="Crash"
                fill="#2E7D32"
                name="Number of Crash Responses"
              />
              <Bar
                dataKey="Complaint"
                fill="#4CAF50"
                name="Number of Complaint Responses"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
          <button
            style={{
              marginTop: "10px",
              padding: "5px 10px",
              backgroundColor:
                tooltipData?.payload?.find((p) => p.dataKey === "Crash")
                  ?.value === 0
                  ? "#9e9e9e" // Grey when crash count = 0
                  : "#059855",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            onClick={() => {
              const GDTID = tooltipData?.payload?.[0]?.payload?.GDTID;
              const crashCount =
                tooltipData?.payload?.find((p) => p.dataKey === "Crash")
                  ?.value || 0;
              const staffName = tooltipData?.label;

              if (crashCount === 0) {
                setStaffNameWithNoCrash(staffName);
                setCrashModalVisible(true);
              } else {
                if (GDTID) navigate(`/GDTcrashes/${GDTID}`);
              }
            }}
          >
            Crash Information
          </button>
          <button
            style={{
              marginTop: "10px",
              marginLeft: "10px",
              padding: "5px 10px",
              backgroundColor:
                tooltipData?.payload?.find((p) => p.dataKey === "Complaint")
                  ?.value === 0
                  ? "#9e9e9e" // Grey when complaint count = 0
                  : "#059855",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
            onClick={() => {
              const GDTID = tooltipData?.payload?.[0]?.payload?.GDTID;
              const complaintCount =
                tooltipData?.payload?.find((p) => p.dataKey === "Complaint")
                  ?.value || 0;
              const staffName = tooltipData?.label;

              if (complaintCount === 0) {
                setStaffNameWithNoComplaint(staffName);
                setComplaintModalVisible(true);
              } else {
                if (GDTID) navigate(`/ChartDetails/ComplaintResponse/${GDTID}`);
              }
            }}
          >
            Complaint Information
          </button>
        </div>
      )}
    </div>
  );
};

export default StaffChart;
