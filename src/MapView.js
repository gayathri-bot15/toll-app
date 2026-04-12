import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import L from "leaflet";
import { getDatabase, ref, push, set, onValue } from "firebase/database";

const vehicleIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/743/743922.png",
  iconSize: [35, 35],
});

function MapView({ user }) {
  const [position, setPosition] = useState([17.385, 78.486]);
  const [prevPos, setPrevPos] = useState(null);
  const [distance, setDistance] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [lastToll, setLastToll] = useState(0);
  const [showToll, setShowToll] = useState(false);
  const [enteredZone, setEnteredZone] = useState(false);
  const [isTripActive, setIsTripActive] = useState(false);
  const [tripToll, setTripToll] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  
  const db = getDatabase();

  useEffect(() => {
    onValue(ref(db, `users/${user.uid}`), (snap) => {
      const data = snap.val();
      if (data) setWallet(data.wallet || 0);
    });
  }, []);

  async function getLocation() {
    try {
      const res = await fetch("https://api.thingspeak.com/channels/3303169/feeds.json?results=1");
      const data = await res.json();
      const lat = parseFloat(data.feeds[0].field1);
      const lng = parseFloat(data.feeds[0].field2);
      if (!isNaN(lat) && !isNaN(lng)) setPosition([lat, lng]);
    } catch (err) { console.log("GPS Error", err); }
  }

  useEffect(() => {
    const interval = setInterval(getLocation, 15000);
    return () => clearInterval(interval);
  }, []);

  function calcDistance(p1, p2) {
    const R = 6371;
    const dLat = (p2[0] - p1[0]) * (Math.PI / 180);
    const dLon = (p2[1] - p1[1]) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1[0] * (Math.PI / 180)) * Math.cos(p2[0] * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const tollZone = [17.385, 78.486];
  const isInsideZone = (pos) => calcDistance(pos, tollZone) <= 0.1;

  useEffect(() => {
    if (!isTripActive) return;
    if (!prevPos) { setPrevPos(position); return; }

    const d = calcDistance(prevPos, position);
    if (d > 0) {
      const newDist = distance + d;
      setDistance(newDist);

      // Distance Toll (₹1 per 1km)
      if (newDist - lastToll >= 1) {
        const cost = 1;
        set(ref(db, `users/${user.uid}/wallet`), wallet - cost);
        push(ref(db, `users/${user.uid}/history`), { type: "distance", amount: cost, time: new Date().toLocaleString() });
        setTripToll(t => t + cost);
        setLastToll(newDist);
        setShowToll(true);
        setTimeout(() => setShowToll(false), 3000);
      }
    }

    // Geofence Toll (₹10)
    if (isInsideZone(position) && !enteredZone) {
      const cost = 10;
      set(ref(db, `users/${user.uid}/wallet`), wallet - cost);
      push(ref(db, `users/${user.uid}/history`), { type: "geofence", amount: cost, time: new Date().toLocaleString() });
      setTripToll(t => t + cost);
      setEnteredZone(true);
    }
    setPrevPos(position);
  }, [position]);

  return (
    <>
      <div style={infoBox}>
        <p><b>Distance:</b> {distance.toFixed(2)} km</p>
        <p><b>Wallet:</b> ₹{wallet}</p>
      </div>

      <div style={controlBox}>
        {!isTripActive ? (
          <button onClick={() => {
            setIsTripActive(true);
            setDistance(0);
            setLastToll(0);
            setTripToll(0);
            setEnteredZone(false);
            setPrevPos(position);
          }} style={btnStyle}>▶ Start Trip</button>
        ) : (
          <button onClick={() => { setIsTripActive(false); setShowSummary(true); }} style={{ ...btnStyle, background: "#ef4444" }}>⏹ Stop Trip</button>
        )}
      </div>

      {showToll && <div style={popup}>₹ Toll Deducted</div>}

      {showSummary && (
        <div style={summaryBox}>
          <h3>Trip Summary</h3>
          <p>Distance: {distance.toFixed(2)} km</p>
          <p>Total Toll: ₹{tripToll}</p>
          <button onClick={() => setShowSummary(false)} style={btnStyle}>OK</button>
        </div>
      )}

      <MapContainer center={position} zoom={15} style={{ height: "90vh", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={position} icon={vehicleIcon} />
        <Circle center={tollZone} radius={100} pathOptions={{ color: "red" }} />
      </MapContainer>
    </>
  );
}

const infoBox = { position: "absolute", top: 10, left: 10, background: "white", padding: "10px", zIndex: 1000, borderRadius: "10px", color: "black" };
const controlBox = { position: "absolute", top: 100, left: 10, zIndex: 1000 };
const popup = { position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)", background: "green", color: "white", padding: "10px", borderRadius: "10px", zIndex: 2000 };
const summaryBox = { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "white", padding: "30px", borderRadius: "15px", zIndex: 3000, textAlign: "center", color: "black", boxShadow: "0 0 20px rgba(0,0,0,0.5)" };
const btnStyle = { padding: "10px 20px", borderRadius: "10px", border: "none", background: "#22c55e", color: "white", fontWeight: "bold", cursor: "pointer" };

export default MapView;