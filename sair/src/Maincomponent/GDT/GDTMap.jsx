import React, { useEffect, useState, useCallback  } from 'react';
import { GoogleMap, InfoWindowF, MarkerF ,HeatmapLayer} from '@react-google-maps/api';
import motorcycle from '../../images/motorcycle.png';
import motorcycle2 from '../../images/delivery-bike (1).png';
import '../../css/CustomModal.css';
import { useNavigate } from 'react-router-dom'; 
import { db } from '../../firebase'; 
import { collection, query, where, getDocs } from "firebase/firestore";


const containerStyle = {
  width: '70%',  // Set the map width
  height: '600px', // Set the map height
  margin: 'auto',  // Center the map
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
  const [expandedMotorcycleId, setExpandedMotorcycleId] = useState(null);
  const [activeMotorcycleId, setActiveMotorcycleId] = useState(null); 

  
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
      setExpandedMotorcycleId(motorcycleData.MotorcycleID); // Set the expanded motorcycle ID
    } else {
      // Handle case where no motorcycle details are found
      setMotorcycleDetails(null);
      setExpandedMotorcycleId(null);
    }
  
    setSelectedLocation(location);
    setActiveMotorcycleId(location.MotorcycleID); // Set the active motorcycle ID
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
  
  return (
<div style={{ display: 'flex', height: '80vh' }}>      
  
  
  
  <GoogleMap 
        mapContainerStyle={containerStyle} 
        center={mapCenter} 
        zoom={zoomLevel}
        onLoad={handleMapLoad}
        // options={{ styles: beigeMapStyle }} 
        onClick={() => setSelectedLocation(null)} 
        // onLoad={() => setIsMapLoaded(true)}
      >

      <div style={{ width: '300px', padding: '10px', borderRight: '1px solid #ccc' }}>
        <h4>Motorcycle List</h4>
        {lastKnownLocations.map((location, index) => (
          <div key={index}>
            <div
              onClick={() => handleMotorcycleClick(location.MotorcycleID)}
              style={{ cursor: 'pointer', margin: '5px 0', color: '#059855' }}
            >
              {location.MotorcycleID}
            </div>
            {expandedMotorcycleId === location.MotorcycleID && (
              <div style={{ paddingLeft: '10px', marginBottom: '10px', backgroundColor: '#f9f9f9' }}>
                <p><strong>GPS Number:</strong> {location.GPSnumber}</p>
                <p><strong>Type:</strong> {location.Type}</p>
                <p><strong>License Plate:</strong> {location.LicensePlate}</p>
              </div>
            )}
          </div>
        ))}
      </div>

        
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
        {zoomLevel >= 16 && lastKnownLocations.map((location, index) => (
  <MarkerF
    key={index}
    position={{ lat: location.lat, lng: location.lng }}
    icon={motorcycleIcon}
    onClick={() => handleMarkerClick(location.gpsNumber, location)} // Pass the location object
  />
))}

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