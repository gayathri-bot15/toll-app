import { MapContainer, TileLayer, Marker, Circle, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { getDatabase, ref, push, onValue, runTransaction } from "firebase/database";

/* Leaflet Fix */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function MapView({ user }) {

  const [position, setPosition] = useState([17.282, 78.536]);
  const [path, setPath] = useState([]);
  //const [wallet, setWallet] = useState(0);
  const [buzzer, setBuzzer] = useState(0);

  const mapRef = useRef();
  const db = getDatabase();
  const vehicleID = "TS09AB1234";

  /* 📡 GPS LIVE FROM FIREBASE */
  useEffect(() => {
    const gpsRef = ref(db, `gps/${vehicleID}`);

    return onValue(gpsRef, (snap) => {
      const data = snap.val();
      if (data && data.lat && data.lng) {
        const newPos = [data.lat, data.lng];

        setPosition(newPos);
        setPath((prev) => [...prev, newPos]);
        setBuzzer(data.buzzer || 0);
      }
    });
  }, []);

  /* 💰 Wallet */
  useEffect(() => {
    if (!user) return;

    const userRef = ref(db, `users/${user.uid}`);
    return onValue(userRef, (snap) => {
      const data = snap.val();
      if (data) setWallet(data.wallet);
    });
  }, [user]);

  /* 📍 Smooth move */
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo(position, 16);
    }
  }, [position]);

  /* 🔴 Toll zones */
  const tollZones = [
    { id: 1, pos: [17.282067, 78.539850] },
    { id: 2, pos: [17.281125, 78.538030] },
    { id: 3, pos: [17.281048, 78.539672] },
  ];

  return (
    <>
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, background: "white", padding: 10 }}>
        💰 ₹{wallet}
      </div>

      {/* 🔔 Buzzer UI */}
      {buzzer === 1 && (
        <div style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          background: "red",
          color: "white",
          padding: 10,
          zIndex: 1000
        }}>
          🚨 Toll Detected!
        </div>
      )}

      <MapContainer
        center={position}
        zoom={16}
        style={{ height: "100vh", width: "100%" }}
        whenCreated={(map) => (mapRef.current = map)}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 🚗 Vehicle */}
        <Marker position={position} />

        {/* 🟢 Path */}
        <Polyline positions={path} />

        {/* 🔴 Toll zones */}
        {tollZones.map((z) => (
          <Circle
            key={z.id}
            center={z.pos}
            radius={20}
            pathOptions={{ color: "red", fillOpacity: 0.4 }}
          />
        ))}
      </MapContainer>
    </>
  );
}

export default MapView;