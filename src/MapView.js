import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import L from "leaflet";
import { getDatabase, ref, push, onValue, runTransaction } from "firebase/database";

/* 🔥 Fix Leaflet marker */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function MapView({ user }) {

  /* ✅ ALL HOOKS FIRST */
  const [position, setPosition] = useState([17.282, 78.536]);
  const [prevPos, setPrevPos] = useState(null);
  const [distance, setDistance] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [lastToll, setLastToll] = useState(0);
  const [visitedTolls, setVisitedTolls] = useState([]);
  const [isTripActive, setIsTripActive] = useState(false);

  const db = getDatabase();

  /* 🔐 Wallet Sync */
  useEffect(() => {
    if (!user || !user.uid) return;

    const userRef = ref(db, `users/${user.uid}`);

    const unsub = onValue(userRef, (snap) => {
      const data = snap.val();
      if (data) setWallet(data.wallet || 0);
    });

    return () => unsub();
  }, [user]);

  /* 📍 GPS */
  async function getLocation() {
    try {
      const res = await fetch("https://api.thingspeak.com/channels/3303169/feeds.json?results=1");
      const data = await res.json();

      if (!data.feeds || !data.feeds[0]) return;

      const lat = parseFloat(data.feeds[0].field1);
      const lng = parseFloat(data.feeds[0].field2);

      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition([lat, lng]);
      }
    } catch (e) {
      console.log("GPS error", e);
    }
  }

  useEffect(() => {
    const interval = setInterval(getLocation, 15000);
    return () => clearInterval(interval);
  }, []);

  /* 📐 Distance */
  function calcDistance(p1, p2) {
    const R = 6371;
    const dLat = (p2[0] - p1[0]) * Math.PI / 180;
    const dLon = (p2[1] - p1[1]) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(p1[0] * Math.PI / 180) *
      Math.cos(p2[0] * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* 🧱 Toll Zones */
  const tollZones = [
    { id: 1, pos: [17.282067, 78.53985] },
    { id: 2, pos: [17.281065, 78.539783] },
    { id: 3, pos: [17.281107, 78.538080] },
  ];

  const RADIUS = 0.02; // 20 meters

  /* 🚗 Main Logic */
  useEffect(() => {
    if (!user || !user.uid || !isTripActive) return;

    if (!prevPos) {
      setPrevPos(position);
      return;
    }

    const d = calcDistance(prevPos, position);
    const newDist = (distance || 0) + d;
    setDistance(newDist);

    /* 💸 Distance Toll */
    if (newDist - lastToll >= 1) {
      const cost = 1;

      runTransaction(ref(db, `users/${user.uid}/wallet`), (cur) => (cur || 0) - cost);

      push(ref(db, `users/${user.uid}/history`), {
        type: "distance",
        amount: cost,
        time: new Date().toLocaleString(),
      });

      setLastToll(newDist);
    }

    /* 🧱 Geofence Toll */
    tollZones.forEach((zone) => {
      const dist = calcDistance(position, zone.pos);

      if (dist <= RADIUS && !visitedTolls.includes(zone.id)) {
        const cost = 10;

        runTransaction(ref(db, `users/${user.uid}/wallet`), (cur) => (cur || 0) - cost);

        push(ref(db, `users/${user.uid}/history`), {
          type: "geofence",
          amount: cost,
          time: new Date().toLocaleString(),
        });

        setVisitedTolls((prev) => [...prev, zone.id]);
      }
    });

    setPrevPos(position);
  }, [position, user, isTripActive]);

  /* ✅ SAFE UI RENDER */
  return (
    <>
      {!user ? (
        <h2 style={{ color: "white" }}>Loading user...</h2>
      ) : (
        <>
          <button onClick={() => setIsTripActive(true)}>Start Trip</button>

          <MapContainer
            center={position || [17.282, 78.536]}
            zoom={15}
            style={{ height: "100vh", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={position} />

            {tollZones.map((z) => (
              <Circle
                key={z.id}
                center={z.pos}
                radius={20}
                pathOptions={{ color: "red" }}
              />
            ))}
          </MapContainer>
        </>
      )}
    </>
  );
}

export default MapView;