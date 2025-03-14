import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import EyeIcon from "../../images/eye.png";
import { Button, Modal } from "antd";
import { Table } from "antd";
import Header from "./GDTHeader";
import { FaFilter } from "react-icons/fa";
import s from "../../css/CrashList.module.css"; // CSS module for CrashList
import c from "../../css/ComplaintList.module.css";
import "../../css/CustomModal.css";
import { Tooltip } from "antd";

const CrashList = () => {
  const [motorcycles, setMotorcycles] = useState({});
  const [crashes, setCrashes] = useState([]);
  const [currentCrash, setCurrentCrash] = useState({});
  const [drivers, setDrivers] = useState({});
  const [GDT, setGDT] = useState({ Fname: "", Lname: "" });
  const [respondingGDT, setRespondingGDT] = useState({
    Fname: "",
    Lname: "", 
    ID: "",
    GDTEmail: "",
    PhoneNumber: "",
  });
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchDriverID, setSearchDriverID] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(""); // Single search input
  const gdtUID = sessionStorage.getItem("gdtUID");
  const [modalVisible, setModalVisible] = useState(false);

  // State to track viewed crashes
  const [viewedCrashes, setViewedCrashes] = useState(() => {
    const storedViewedCrashes = sessionStorage.getItem("viewedCrashes");
    return storedViewedCrashes ? JSON.parse(storedViewedCrashes) : {};
  });

  const fetchGDT = async () => {
    try {
      const docRef = doc(db, "GDT", gdtUID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("Document data:", docSnap.data());
        setGDT(docSnap.data()); // Set the retrieved data to the GDT state
      } else {
        console.error("No such document!");
      }
    } catch (error) {
      console.error("Error fetching document:", error);
    }
  };

  useEffect(() => {
    const fetchDriversAndCrashes = async () => {
      if (!gdtUID) return;

      const GDTDoc = await getDoc(doc(db, "GDT", gdtUID));

      const driverCollection = query(collection(db, "Driver"));

      const unsubscribeDrivers = onSnapshot(driverCollection, (snapshot) => {
        const driverIds = [];
        const driverMap = {};
        const companyPromises = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.DriverID) {
            driverMap[data.DriverID] = {
              name: `${data.Fname} ${data.Lname}`,
              companyName: data.CompanyName,
              shortCompanyName: "", // Placeholder for ShortCompanyName
            };
          }

          driverIds.push(data.DriverID);
          companyPromises.push(
            fetchCompany(data.CompanyName).then((shortName) => {
              driverMap[data.DriverID].shortCompanyName = shortName;
            })
          );
        });

        if (driverIds.length === 0) {
          console.error("No valid Driver IDs found.");
          return;
        }

        setDrivers(driverMap);
        fetchCrashes(driverIds);
        fetchGDT();
      });

      return () => unsubscribeDrivers();
    };

    const fetchCompany = async (companyName) => {
      const companyQuery = query(
        collection(db, "Employer"),
        where("CompanyName", "==", companyName)
      );

      const snapshot = await getDocs(companyQuery);
      if (!snapshot.empty) {
        const companyData = snapshot.docs[0].data();
        return companyData.ShortCompanyName || companyName; // Fallback to full name if short name not available
      }
      return companyName; // Return the original name if no match found
    };

    const fetchCrashes = (driverIds) => {
      if (!driverIds || driverIds.length === 0) {
        console.error("Driver IDs are invalid.");
        return;
      }

      const crashCollection = query(
        collection(db, "Crash"),
        where("driverID", "in", driverIds)
      );

      const unsubscribeCrashes = onSnapshot(crashCollection, (snapshot) => {
        const crashList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("Fetched Crashes:", crashList); // Debugging

        setCrashes(crashList);
        fetchMotorcycles(crashList);
      });

      return () => unsubscribeCrashes();
    };

    const fetchMotorcycles = (crashList) => {
      const crashIDs = crashList
        .map((crash) => crash.crashID)
        .filter((id) => id); // Filter out undefined or null;

      if (!crashIDs || crashIDs.length === 0) {
        console.error("No valid Crash IDs found.");
        return;
      }

      const motorcycleCollection = query(
        collection(db, "History"),
        where("ID", "in", crashIDs) // Ensure this matches the ID field in History
      );

      const unsubscribeMotorcycles = onSnapshot(
        motorcycleCollection,
        (snapshot) => {
          const motorcycleMap = {};
          snapshot.forEach((doc) => {
            const data = doc.data();
            motorcycleMap[data.ID] = data.LicensePlate; // Map ID to LicensePlate
          });
          setMotorcycles(motorcycleMap);
        }
      );

      return () => unsubscribeMotorcycles();
    };

    fetchDriversAndCrashes();
  }, [gdtUID]);

  const filterByStatus = (record) => {
    const formattedStatus =
      record.Status.charAt(0).toUpperCase() +
      record.Status.slice(1).toLowerCase();

    if (selectedStatus === "Responsed") {
      return formattedStatus === "Emergency sos" && record.RespondedBy != null; // Responded
    } else if (selectedStatus === "Unresponsed") {
      return formattedStatus === "Emergency sos" && record.RespondedBy == null; // Unresponded
    }
    return true; // Show all if no filter is selected
  };

  const filteredCrashes = crashes
    .filter(
      (crash) => crash.Status === "Emergency SOS" || crash.Status === "Denied"
    ) // Filter by status
    .filter((crash) => {
      const crashDate = crash.time
        ? new Date(crash.time * 1000).toISOString().split("T")[0]
        : "";
      const matchesSearchDate = searchDate ? crashDate === searchDate : true;

      const driverName = drivers[crash.driverID]?.name || " ";
      const driverId = crash.driverID;
      const companyName = drivers[crash.driverID]?.shortCompanyName || "  ";
      const licensePlate = motorcycles[crash.crashID] || ' ';

      const matchesSearchQuery =
        driverId.includes(searchQuery) ||
        licensePlate.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearchQuery && matchesSearchDate;
    })
    .filter(filterByStatus) // Apply the filterByStatus function here
    .sort((a, b) => (b.time || 0) - (a.time || 0)); // Sort by time in descending order

  const formatDate = (time) => {
    const date = new Date(time * 1000);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-based
    const day = date.getDate().toString().padStart(2, "0"); // Days are 1-based
    return `${month}/${day}/${year}`; // Format as MM/DD/YYYY
  };

  const GDTResponse = (RespondedBy, setResponseByName) => {
    try {
      // Query the GDT collection based on RespondedBy ID
      const gdtQuery = query(collection(db, "GDT"), where("ID", "==", RespondedBy));
  
      // Set up a real-time listener
      const unsubscribe = onSnapshot(gdtQuery, (snapshot) => {
        if (!snapshot.empty) {
          const gdtData = snapshot.docs[0].data();
          setResponseByName(`${gdtData.Fname} ${gdtData.Lname}`);
        } else {
          console.error("No GDT document found with ID:", RespondedBy);
          setResponseByName("Unknown");
        }
      });
  
      // Cleanup function to remove listener when component unmounts
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching GDT details:", error);
      setResponseByName("Error");
    }
  };
  
  const ResponseBy = ({ respondedBy }) => {
    const [responseByName, setResponseByName] = useState("");
  
    useEffect(() => {
      if (respondedBy) {
        const unsubscribe = GDTResponse(respondedBy, setResponseByName);
        return () => unsubscribe && unsubscribe(); // Cleanup listener on unmount
      }
    }, [respondedBy]);
  
    return <span>{responseByName}</span>;
  };

  const handleViewDetails = (record) => {
    setModalVisible(false);
    const updatedViewedCrashes = { ...viewedCrashes, [record.id]: true };
    setViewedCrashes(updatedViewedCrashes);
    sessionStorage.setItem(
      "viewedCrashes",
      JSON.stringify(updatedViewedCrashes)
    );

    navigate(`/gdtcrash/general/${record.id}`);
  };

  const handleConfirmResponse = (record) => {
    setCurrentCrash(record);
    setModalVisible(true); // Show the confirmation modal
  };

  const handleResponse = async () => {
    setModalVisible(false); // Close the modal

    try {
      // Ensure the GDT data is valid
      if (!GDT.Fname || !GDT.Lname) {
        console.error("Responder details are incomplete");
        return;
      }

      const updatedCrash = {
        ...currentCrash,
        RespondedBy: `${GDT.Fname} ${GDT.Lname}`, // Combine first and last name
      };

      const crashDocRef = doc(db, "Crash", currentCrash.id);

      // Update Firestore with the new RespondedBy field
      await updateDoc(crashDocRef, { RespondedBy: updatedCrash.RespondedBy });

      // Update the local state with the new crash details
      setCurrentCrash(updatedCrash);

      console.log("Crash response updated successfully");
    } catch (error) {
      console.error("Error updating crash response:", error);
    }
  };

  const columns = [
    {
      title: "Crash ID",
      dataIndex: "crashID",
      key: "id",
      align: "center",
    },
    {
      title: "Driver Name",
      key: "driverName",
      align: "center",
      render: (text, record) => {
        const driverName = drivers[record.driverID]?.name || "   ";
        const capitalizeddriverName =
          driverName.charAt(0).toUpperCase() + driverName.slice(1);
        return capitalizeddriverName;
      },
    },
    {
      title: "Company Name",
      key: "CompanyName",
      align: "center",
      render: (text, record) => {
        const companyName = drivers[record.driverID]?.shortCompanyName || "   ";
        const capitalizedCompanyName =
          companyName.charAt(0).toUpperCase() + companyName.slice(1);
        return capitalizedCompanyName;
      },
    },
    {
      title: "Motorcycle License Plate",
      key: "motorcyclePlate",
      align: "center",
      render: (text, record) => motorcycles[record.crashID] || "   ", // Use crashID to fetch motorcycle
    },
    {
      title: "Status",
      key: "Status",
      align: "center",
      render: (text, record) => {
        const formattedStatus = record.Status;
        return (
          <span
            style={{
              color: formattedStatus === "Emergency SOS" ? "red" : "green",
            }}
          >
            {formattedStatus}
          </span>
        );
      },
    },
    {
      title: "Response By",
      key: "responseby",
      align: "center",
      render: (text, record) => {
        const formattedStatus =
          record.Status.charAt(0).toUpperCase() +
          record.Status.slice(1).toLowerCase();

        if (formattedStatus === "Denied") {
          return <span style={{ color: "grey" }}>No Response Needed</span>;
        } else if (formattedStatus === "Emergency sos" && record.RespondedBy) {
          // Render the RespondedBy value with an underline
          return <ResponseBy respondedBy={record.RespondedBy} />;
        } else if (formattedStatus === "Emergency sos" && !record.RespondedBy) {
          return (
            // i did not remove the function but only change button to p also remove on click
            <p
              style={{
                backgroundColor: "transparent",
                color: "red",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "default",
              }}

            >
              Need for Response
            </p>
          );
        } else {
          return null;
        }
      },
    },
    {
      title: "Date",
      key: "date",
      align: "center",
      render: (text, record) => formatDate(record.time),
    },
    {
      title: "Crash Details",
      key: "Details",
      align: "center",
      render: (text, record) => (
        <Link
          to={`/gdtcrash/general/${record.id}`}
          onClick={() => handleViewDetails(record)}
        >
          <img style={{ cursor: "pointer" }} src={EyeIcon} alt="Details" />
        </Link>
      ),
    },
  ];

  return (
    <>
      <Header active="gdtcrashes" />
      <div className="breadcrumb">
        <a onClick={() => navigate("/gdthome")}>Home</a>
        <span> / </span>
        <a onClick={() => navigate("/gdtcrashes")}>Crashes List</a>
      </div>
      <main>
        <div className={s.container}>
          <div className={s.searchHeader}>
            <h2 className={s.title}>Crashes List</h2>
            <div className={s.searchInputs}>
              <div className={s.searchContainer}>
                <svg
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="#059855"
                    strokeLinecap="round"
                    strokeWidth="2"
                    d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  />
                </svg>

                <input
                  type="text"
                  placeholder="Search by Driver ID or License Plate"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "235px", height:"20px" }}
                />
              </div>
            </div>
            <div className={s.searchContainer}>
              <div className={c.selectWrapper}>
                <FaFilter className={c.filterIcon} />
                <select
                  className={c.customSelect}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  defaultValue=""
                  style={{
                    width: "280px", 
                    height:"35px", // Widen the select bar
                    padding: "8px", // Add padding
                    fontSize: "14px", // Adjust font size
                    color:'grey'
                  }}
                >
                  <option value="" disabled>
                    Filter by Response
                  </option>
                  <option value="">All</option>
                  <option value="Responsed">Responsed</option>
                  <option value="Unresponsed">Unresponsed</option>
                </select>
              </div>
            </div>
            <div
  className={s.searchContainerdate}
  style={{ position: "relative" }}
>
  <div>
    {/* Conditional rendering for the green circle with tick */}
    {searchDate && (
      <div style={{
        position: "absolute",
        top: "-1px",  // Adjust this value to position it vertically
        right: "-1px",  // Adjust this value to position it horizontally
        width: "20px",  // Size of the circle
        height: "20px", // Size of the circle
        borderRadius: "50%",
        backgroundColor: "green",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontSize: "14px",
        zIndex: 1, // Ensure it appears in front
      }}>
        ✓ 
      </div>
    )}

    {/* Your SVG Icon */}
    <svg
      onClick={() => document.getElementById("date-input").focus()}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        top: "50%",
        left: "1px",
        transform: "translateY(-50%)",
        cursor: "pointer",
        width: "40px", // Adjusted width
        height: "40px", // Adjusted height
      }}
    >
      <path
        d="M18 2V4M6 2V4"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.9955 13H12.0045M11.9955 17H12.0045M15.991 13H16M8 13H8.00897M8 17H8.00897"
        stroke="#059855"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 8H20.5"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 12.2432C2.5 7.88594 2.5 5.70728 3.75212 4.35364C5.00424 3 7.01949 3 11.05 3H12.95C16.9805 3 18.9958 3 20.2479 4.35364C21.5 5.70728 21.5 7.88594 21.5 12.2432V12.7568C21.5 17.1141 21.5 19.2927 20.2479 20.6464C18.9958 22 16.9805 22 12.95 22H11.05C7.01949 22 5.00424 22 3.75212 20.6464C2.5 19.2927 2.5 17.1141 2.5 12.7568V12.2432Z"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 8H21"
        stroke="#059855"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>

    <input
      id="date-input"
      type="date"
      value={searchDate}
      onChange={(e) => setSearchDate(e.target.value)}
      style={{
        width: "100%",
        height: "40px", // Adjusted height
        fontSize: "16px",
        paddingLeft: "40px", // Add padding to avoid overlap with the icon
        backgroundColor: "transparent",
        border: "0px solid #ccc",
        borderRadius: "4px",
      }}
    />
  </div>
</div>
          </div>

          <Modal
            title="Confirm Response"
            visible={modalVisible}
            onCancel={() => setModalVisible(false)} // Close the modal when canceled
            centered
            footer={[
              <Button
                key="details"
                onClick={() => {
                  setModalVisible(false);
                  handleViewDetails(currentCrash); // Navigate to crash details when the button is clicked
                }}
              >
                {" "}
                {/* see crash details: handleViewDetails(record.id) */}
                Crash Details
              </Button>,
              <Button key="confirm" type="primary" onClick={handleResponse}>
                Confirm
              </Button>,
            ]}
          >
            <p>
              {GDT.Fname.charAt(0).toUpperCase() + GDT.Fname.slice(1)}{" "}
              {GDT.Lname.charAt(0).toUpperCase() + GDT.Lname.slice(1)}, by
              clicking on confirm button, you formally acknowledge your
              responsibility for overseeing the management of this crash.
              <br />
              <br />
              Additionally, you affirm your obligation to ensure that the driver
              involved has been contacted.
            </p>
          </Modal>

          <Table
            columns={columns}
            dataSource={filteredCrashes}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            onRow={(record) => ({
              style: {
                backgroundColor:
                  !viewedCrashes[record.id] && !record.RespondedBy
                    ? "#d0e0d0"
                    : "transparent",
              },
            })}
          />
        </div>
      </main>
    </>
  );
};

export default CrashList;
