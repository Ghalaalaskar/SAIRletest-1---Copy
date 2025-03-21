import React, { useEffect, useState, useCallback  } from 'react';
import { GoogleMap, InfoWindowF, MarkerF ,HeatmapLayer} from '@react-google-maps/api';
import motorcycle from '../../images/motorcycle.png';
import '../../css/CustomModal.css';
import { useNavigate } from 'react-router-dom'; 
import { db } from '../../firebase'; 
import { collection, query, where, getDocs } from "firebase/firestore";
import { SearchOutlined } from '@ant-design/icons'; 
import { FaFilter } from 'react-icons/fa'; 
import s from "../../css/ComplaintList.module.css"; // CSS module for ComplaintList

const containerStyle = {
  width: '74%',  // Set the map width
  height: '590px', // Set the map height
  margin: 'auto',  // Center the map
  marginRight:'8px',
  marginLeft:'8px',
};

// const beigeMapStyle = [
//   { elementType: "geometry", stylers: [{ color: "									#FFFAF0" }] }, // Base Color
//   { elementType: "labels.text.fill", stylers: [{ color: "#776543" }] }, // Dark Brown Text
//   { elementType: "labels.text.stroke", stylers: [{ color: "#f3f3f3" }] }, // Light Stroke Around Text
//   { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] }, // Hide Borders
//   { featureType: "water", stylers: [{ color: "#d4c4b7" }] }, // Light Beige Water
//   { featureType: "road", stylers: [{ color: "#e6d5c3" }] }, // Light Beige Roads
// ];

const GDTMap = ({ locations }) => {  
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [map, setMap] = useState(null); 
  // const [isMapLoaded, setIsMapLoaded] = useState(false); 
  const [mapCenter, setMapCenter] = useState({ lat: 24.7136, lng: 46.6753 }); // Default center
  const [lastKnownLocations, setLastKnownLocations] = useState(() => {
    const storedLocations = localStorage.getItem("lastKnownLocations");
    return storedLocations ? JSON.parse(storedLocations) : []; 
  });
  const [initialLoad, setInitialLoad] = useState(true); // Track if it's the initial load
  const [zoomLevel, setZoomLevel] = useState(14); // Default zoom level
  const [driverDetails, setDriverDetails] = useState(null);
  const [motorcycleDetails, setMotorcycleDetails] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [shortCompanyName, setShortCompanyName] = useState('');
  const [expandedMotorcycleIds, setExpandedMotorcycleIds] = useState([]);
  const [expandedMotorcycleId, setExpandedMotorcycleId] = useState([]);
  const [activeMotorcycleId, setActiveMotorcycleId] = useState(null); 
  const [motorcycleData, setMotorcycleData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uniqueCompanyNames, setUniqueCompanyNames] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  
  const capitalizeFirstLetter = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  console.log("GDTMap Component");
  const updateMapData = useCallback(() => {
    if (locations.length > 0 && window.google && window.google.maps) {
      const newHeatmapData = locations
        .filter(loc => loc && !isNaN(loc.lat) && !isNaN(loc.lng))
        .map(loc => new window.google.maps.LatLng(loc.lat, loc.lng));
      setHeatmapData(newHeatmapData);

      // Only set lastKnownLocations and mapCenter on the first load
      if (initialLoad) {
        setLastKnownLocations(locations);
        setMapCenter({ lat: locations[0].lat, lng: locations[0].lng });
        setInitialLoad(false); // Prevent further updates
      }
    }
  }, [locations, initialLoad]);

  useEffect(() => {
    updateMapData();
  }, [locations, updateMapData]);

  useEffect(() => {
    window.gm_authFailure = function() {
      console.error("Google Maps API authentication failed.");
    };
  }, []);

  /*useEffect(() => {
    console.log("Locations received:", locations);
    
    if (locations.length > 0) {
      try {
        if (!window.google || !window.google.maps) {
          console.warn("Google Maps API is not loaded yet.");
          return;
        }

        setHeatmapData(
          locations
            .filter(loc => loc && !isNaN(loc.lat) && !isNaN(loc.lng)) 
            .map(loc => new window.google.maps.LatLng(loc.lat, loc.lng))
        );
        setLastKnownLocations(locations); // 
        localStorage.setItem("lastKnownLocations", JSON.stringify(locations)); 

      } catch (error) {
        console.error("Error creating LatLng objects:", error);
      }
    }
  }, [locations]); */

  useEffect(() => {
    if (window.google && window.google.maps) {
      console.log("Google Maps API Loaded Successfully");
      // setIsMapLoaded(true);
    }
  }, []);

  const fetchMotorcycleAndDriverData = async () => {
    const gpsNumbers = locations.map(loc => loc.gpsNumber);
    
    const motorcyclePromises = gpsNumbers.map(gpsNumber => {
      const motorcycleQuery = query(
        collection(db, "Motorcycle"),
        where("GPSnumber", "==", gpsNumber)
      );
      return getDocs(motorcycleQuery);
    });
  
    const driverPromises = gpsNumbers.map(gpsNumber => {
      const driverQuery = query(
        collection(db, "Driver"),
        where("GPSnumber", "==", gpsNumber)
      );
      return getDocs(driverQuery);
    });
  
    const employerPromises = gpsNumbers.map(async (gpsNumber) => {
      // Fetch the driver details first to get the CompanyName
      const driverQuery = query(
        collection(db, "Driver"),
        where("GPSnumber", "==", gpsNumber)
      );
      const driverSnapshot = await getDocs(driverQuery);
      if (!driverSnapshot.empty) {
        const driverData = driverSnapshot.docs[0].data();
        const employerQuery = query(
          collection(db, "Employer"),
          where("CompanyName", "==", driverData.CompanyName)
        );
        return getDocs(employerQuery);
      }
      return null; // If no driver found, return null
    });
  
    const motorcycleSnapshots = await Promise.all(motorcyclePromises);
    const driverSnapshots = await Promise.all(driverPromises);
    const employerSnapshots = await Promise.all(employerPromises);
  
    const motorcyclesWithDrivers = motorcycleSnapshots.map((snapshot, index) => {
      const motorcycleData = snapshot.docs[0]?.data();
      const driverData = driverSnapshots[index].docs[0]?.data();
      const employerData = employerSnapshots[index]?.docs[0]?.data();
  
      return {
        motorcycleID: motorcycleData?.MotorcycleID || 'N/A',
        driverID: driverData?.DriverID || 'N/A',
        driverName: driverData ? `${driverData.Fname} ${driverData.Lname}` : 'Unknown',
        phoneNumber: driverData?.PhoneNumber || 'N/A',
        shortCompanyName: employerData?.ShortCompanyName || 'N/A', // Set ShortCompanyName from employer data
        gpsNumber: motorcycleData?.GPSnumber || 'N/A',
        type: motorcycleData?.Type || 'N/A',
        licensePlate: motorcycleData?.LicensePlate || 'N/A',
      };
    });
  
    setMotorcycleData(motorcyclesWithDrivers);
  };

  useEffect(() => {
    if (locations.length > 0) {
      fetchMotorcycleAndDriverData();
    }
  }, [locations]);
 
  useEffect(() => {
    const fetchUniqueCompanyNames = () => {
      const companyNames = motorcycleData.map(item => item.shortCompanyName);
      const uniqueNames = [...new Set(companyNames)]; // Get unique names
      setUniqueCompanyNames(uniqueNames);
    };

    if (motorcycleData.length > 0) {
      fetchUniqueCompanyNames();
    }
  }, [motorcycleData]);

  const motorcycleIcon = {
    url: motorcycle, 
    scaledSize: new window.google.maps.Size(50, 50), 
    origin: new window.google.maps.Point(0, 0), 
    anchor: new window.google.maps.Point(25, 50)
  };

  const handleMapLoad = (mapInstance) => {
    mapInstance.addListener('zoom_changed', () => {
      setZoomLevel(mapInstance.getZoom());
    });
  };

  /* const center = locations.length > 0 ? { lat: locations[0].lat, lng: locations[0].lng } : { lat: 24.7136, lng: 46.6753 };
  const center = lastKnownLocations.length > 0 
  ? { lat: lastKnownLocations[0].lat, lng: lastKnownLocations[0].lng } 
  : { lat: 24.7136, lng: 46.6753 };
  // if (!isMapLoaded) {
  //   return <div className="loading-message">Loading Map...</div>;
  // }*/

  const handleMarkerClick = async (gpsNumber, location) => {
    // Close any expanded dropdowns
    setExpandedMotorcycleId(null); // Close dropdowns when a marker is clicked
  
    // Fetch driver details based on GPS number
    const driverQuery = query(
      collection(db, "Driver"),
      where("GPSnumber", "==", gpsNumber)
    );
  
    const driverSnapshot = await getDocs(driverQuery);
    if (!driverSnapshot.empty) {
      const driverData = driverSnapshot.docs[0].data();
      setDriverDetails(driverData);
  
      const employerQuery = query(
        collection(db, "Employer"),
        where("CompanyName", "==", driverData.CompanyName)
      );
  
      const employerSnapshot = await getDocs(employerQuery);
      if (!employerSnapshot.empty) {
        const employerData = employerSnapshot.docs[0].data();
        setShortCompanyName(employerData.ShortCompanyName);
      } else {
        setShortCompanyName('Not available');
      }
    }
  
    // Fetch motorcycle details based on GPS number
    const motorcycleQuery = query(
      collection(db, "Motorcycle"),
      where("GPSnumber", "==", gpsNumber)
    );
  
    const motorcycleSnapshot = await getDocs(motorcycleQuery);
    if (!motorcycleSnapshot.empty) {
      const motorcycleData = motorcycleSnapshot.docs[0].data();
      setMotorcycleDetails(motorcycleData);
      setSelectedLocation(location); // Set the selected location
    } else {
      setMotorcycleDetails(null);
    }
  };

  const handleListItemClick = (motorcycleId) => {
    const clickedLocation = lastKnownLocations.find(loc => loc.MotorcycleID === motorcycleId);
    if (clickedLocation) {
      setActiveMotorcycleId(motorcycleId); // Set the clicked motorcycle as active
      setSelectedLocation(clickedLocation); // Set the selected location
    }
  };

  const handleMotorcycleClick = (motorcycleId) => {
    const clickedLocation = lastKnownLocations.find(loc => loc.MotorcycleID === motorcycleId);
    if (clickedLocation) {
      setActiveMotorcycleId(motorcycleId); // Set the clicked motorcycle as active
      setSelectedLocation(clickedLocation); // Set the selected location
    }
  };
  
  const toggleExpand = (motorcycleID) => {
    setExpandedMotorcycleIds((prev) =>
      prev.includes(motorcycleID)
        ? prev.filter(id => id !== motorcycleID) // Remove if already expanded
        : [...prev, motorcycleID] // Add to expanded
    );
  };
  
  const capitalizeName = (name) => {
    return name.split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  };
  
  const filteredMotorcycleData = motorcycleData.filter(item => {
    const matchesSearch = item.driverName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.driverID.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedStatus === "" || item.shortCompanyName === selectedStatus;
  
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ display: 'flex', height: '80vh' }}>
    <div style={{ width: '400px', padding: '10px', borderRight: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
      <h4 style={{ color: 'green', fontSize: '25px', marginBottom: '10px' }}>Motorcycle List</h4>
      <div style={{  flexDirection: 'column', marginBottom: '10px', alignItems: 'flex-start' }}>
  {/* Search Bar */}
  <div className={s.searchInputs} style={{ width: '100%' }}>
  <div className={s.searchContainer} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
    <SearchOutlined style={{ color: '#059855', marginRight: '5px' , marginLeft:'-70px'}} />
    <input
      type="text"
      placeholder="Search by Driver ID or Driver Name"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      style={{
        width: "230px",
        height: "20px",  // Ensures consistent height
        borderRadius: '20px', // Round corners
        border: 'none',  // Remove border
        backgroundColor: 'transparent', // Transparent background
        padding: '0 0 0 0px',  // Left padding to give space for icon
        boxSizing: 'border-box',  // Include padding in width
        outline: 'none', // Remove outline on focus
      }}
    />
  </div>
</div>

  {/* Filter Dropdown */}
  <div className={s.searchContainer} style={{ marginTop:'5px'}} >
   <div className={s.selectWrapper} style={{ width: '100%',height:'25px'}}>
    <FaFilter className={s.filterIcon} style={{ marginRight: '5px' }}/>
    <select
      className={s.customSelect}
      onChange={(event) => setSelectedStatus(event.target.value)}
      defaultValue=""
      style={{
        width: "230px", 
        height: "35px",
        padding: "4px",
        fontSize: "14px",
        color: 'grey',
        border: '1px none #059855',
        borderRadius: '4px'
      }}
    >
      <option value="" disabled>Filter by Company Name</option>
      <option value="">All</option>
      {uniqueCompanyNames.map((name, index) => (
        <option key={index} value={name}>{name}</option>
      ))}
    </select>
  </div>
  </div>
</div>
      <ul style={{ listStyleType: 'none', padding: '0' }}>
        {filteredMotorcycleData.map((item, index) => (
          <li key={index} style={{ position: 'relative', marginBottom: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ color: '#059855' }}>Motorcycle ID:</strong> {item.motorcycleID} <br />
                <strong style={{ color: '#059855' }}>Driver Name:</strong> {capitalizeName(item.driverName)}
              </div>
              <button 
                onClick={() => toggleExpand(item.motorcycleID)} 
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '0px',
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'grey',
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#059855'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'grey'}
              >
                {expandedMotorcycleIds.includes(item.motorcycleID) ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path d="M6 16 L12 10 L18 16" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <path d="M6 8 L12 14 L18 8" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                )}
              </button>
            </div>
            {expandedMotorcycleIds.includes(item.motorcycleID) && (
              <div style={{ fontSize: '12px', color: '#555', marginTop: '5px' }}>
                <p style={{ margin: '5px 0' }}><strong style={{ color: '#059855' }}>Driver ID:</strong> {item.driverID}</p>
                <p style={{ margin: '5px 0' }}><strong style={{ color: '#059855' }}>Phone:</strong> {item.phoneNumber}</p>
                <p style={{ margin: '5px 0' }}><strong style={{ color: '#059855' }}>Company:</strong> {item.shortCompanyName}</p>
                <p style={{ margin: '5px 0' }}><strong style={{ color: '#059855' }}>GPS Number:</strong> {item.gpsNumber}</p>
                <p style={{ margin: '5px 0' }}><strong style={{ color: '#059855' }}>Type:</strong> {item.type}</p>
                <p style={{ margin: '5px 0' }}><strong style={{ color: '#059855' }}>License Plate:</strong> {item.licensePlate}</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '5px' }}>
                  <button
                    onClick={() => navigate(`/gdtdriverdetails/${item.driverID}`)}
                    style={{
                      backgroundColor: '#059855',
                      color: 'white',
                      border: 'none',
                      padding: '5px',
                      width: '120px',
                      cursor: 'pointer',
                      marginBottom: '5px'
                    }}
                  >
                    Full Information
                  </button>
                  <button
                    onClick={() => {
                      {/*const location = lastKnownLocations.find(loc => loc.gpsNumber === item.gpsNumber);
                      if (location) {
                        setMapCenter({ lat: location.lat, lng: location.lng });
                        setSelectedLocation(location);
                      }*/}
                    }}
                    style={{
                      backgroundColor: '#059855',
                      color: 'white',
                      border: 'none',
                      padding: '5px',
                      width: '120px',
                      cursor: 'pointer'
                    }}
                  >
                    Go to Location
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>

{/* The gps number in the location saved in array after that query the driver collection and motorcycle then display them in the list */}

  
  <GoogleMap 
        mapContainerStyle={containerStyle} 
        center={mapCenter} 
        zoom={zoomLevel}
        onLoad={handleMapLoad}
        // options={{ styles: beigeMapStyle }} 
        onClick={() => setSelectedLocation(null)} 
        // onLoad={() => setIsMapLoaded(true)}
      >

        
        {heatmapData.length > 0 && (
          <HeatmapLayer
            data={heatmapData}
            options={{
              radius: 30,
              opacity: 0.7,
              gradient: [
                'rgba(0, 0, 255, 0)',    // Transparent blue
                'rgba(0, 255, 255, 1)',  // Cyan
                'rgba(0, 255, 0, 1)',    // Green
                'rgba(255, 255, 0, 1)',  // Yellow
                'rgba(255, 128, 0, 1)',  // Orange
                'rgba(255, 0, 0, 1)',    // Red
              ],
            }}
          />
        )}

        {/* Render markers only if zoom level is 15 or higher */}
        {/*lastKnownLocations.map((location, index) =>(    here is the old code without zooming*/}
     {zoomLevel >= 16 && filteredMotorcycleData.map((item, index) => {
  const location = lastKnownLocations.find(loc => loc.MotorcycleID === item.motorcycleID);
  return location ? (
    <MarkerF
      key={index}
      position={{ lat: location.lat, lng: location.lng }}
      icon={motorcycleIcon}
      onClick={() => handleMarkerClick(location.gpsNumber, location)}
    />
  ) : null; // Ensure location is valid
})}

{selectedLocation && (
          <InfoWindowF
          position={{ lat: selectedLocation.lat + 0.00005, lng: selectedLocation.lng }}
          onCloseClick={() => {
            setSelectedLocation(null);
            setDriverDetails(null);
            setMotorcycleDetails(null);
            setShortCompanyName('');
          }}
          options={{ pixelOffset: new window.google.maps.Size(0, -40) }} // Adjust offset if needed
        >
          <div style={{ margin: 0, padding: '10px', lineHeight: '1.5' }}>
            <h4 style={{ color: '#059855' ,margin: '-13px -10px 0px', padding: '-10px' }}>Driver Information</h4>
            <p style={{ margin: '0' }}><strong style={{ color: '#059855' }}>Driver ID:</strong> {driverDetails.DriverID}</p>
            <p style={{ margin: '0' }}><strong style={{ color: '#059855' }}>Name:</strong> {capitalizeFirstLetter(driverDetails?.Fname)} {capitalizeFirstLetter(driverDetails?.Lname)}</p>
            <p style={{ margin: '0' }}><strong style={{ color: '#059855' }}>Phone:</strong> {driverDetails.PhoneNumber}</p>
        {/*  <p style={{ marginBottom: '0px' }}><strong style={{ color: '#059855' }}>Email: </strong> 
          <a
            href={`mailto:${driverDetails.Email}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              color: isHovered ? '#059855' : 'black',
              textDecoration: 'none'
            }}
          >
            {driverDetails.Email}
          </a>
        </p> */}    
              <p style={{ marginBottom: '-10px' }}><strong style={{ color: '#059855' }}>Company Name:</strong> {capitalizeFirstLetter(shortCompanyName) || 'Not available'}</p>               <hr></hr>
            <h4 style={{ color: '#059855' ,margin: '-13px -10px 0px' }}>Motorcycle Info</h4>
            <p style={{ margin: '0' }}><strong style={{ color: '#059855' }}>ID:</strong> {motorcycleDetails.MotorcycleID}</p>
            <p style={{ margin: '0' }}><strong style={{ color: '#059855' }}>GPS Number:</strong> {motorcycleDetails.GPSnumber}</p>
            <p style={{ margin: '0' }}><strong style={{ color: '#059855' }}>Type:</strong> {motorcycleDetails.Type}</p>
            <p style={{ margin: '0' }}><strong style={{ color: '#059855' }}>License Plate:</strong> {motorcycleDetails.LicensePlate}</p>
            <button
                onClick={() => navigate(`/gdtdriverdetails/${driverDetails.DriverID}`)}
                style={{ backgroundColor: '#059855', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer',width:'120px', marginLeft:'100px', marginTop:'10px', marginBottom:'-25px' }}
              >
                Full Information
              </button>
          </div>
        </InfoWindowF>
        )}
      </GoogleMap>

    </div>
  );
};

export default GDTMap;