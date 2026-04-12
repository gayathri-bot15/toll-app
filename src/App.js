import { useState, useEffect } from "react";
import MapView from "./MapView";
import Login from "./Login";

import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue, set } from "firebase/database";

import { Home, Map, Wallet, List, Settings, Bell, User, Sun, Moon } from "lucide-react";

/* 🔥 FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyBeGRnxButqwIil_xn9haXm3WaG00tVvow",
  authDomain: "gps-toll-system-9ac8b.firebaseapp.com",
  databaseURL: "https://gps-toll-system-9ac8b-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "gps-toll-system-9ac8b",
};

initializeApp(firebaseConfig);

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [page, setPage] = useState("home");
  const [dark, setDark] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState("");

  const auth = getAuth();
  const db = getDatabase();

  /* 🔐 AUTH LISTENER */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
    });
    return () => unsub();
  }, []);

  /* 📡 USER DATA LISTENER (FIXED) */
  useEffect(() => {
    if (!user) return;

    const userRef = ref(db, `users/${user.uid}`);

    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        setUserData(data);
      } else {
        console.log("⚠️ No data found for UID:", user.uid);

        // fallback only for UI (temporary)
        setUserData({
          name: "User",
          wallet: 0,
          vehicle: "Unknown",
          type: "Car"
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return <Login setUser={setUser} />;
  if (!userData) return <div style={{ color: "white", padding: "20px" }}>Loading...</div>;

  const toggleTheme = () => setDark(!dark);

  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        background: dark
          ? "linear-gradient(180deg,#0f172a,#020617)"
          : "#f1f5f9",
        color: dark ? "white" : "black",
        minHeight: "100vh",
        paddingBottom: "70px",
      }}
    >
      {/* 🔔 Notification */}
      <div
        style={{
          position: "absolute",
          top: 15,
          right: 20,
          zIndex: 2000,
          cursor: "pointer",
        }}
      >
        <Bell size={22} />
      </div>

      {/* 🏠 HOME */}
      {page === "home" && (
        <div style={{ padding: "20px" }}>
          <h2>🚗 GPS Toll System</h2>

          <div style={walletCard}>
            <h3>Wallet Balance</h3>
            <h1>₹{userData.wallet || 0}</h1>
          </div>

          <button onClick={() => setPage("map")} style={btnStyle}>
            Start Trip 🚗
          </button>
        </div>
      )}

      {/* 🗺️ MAP */}
      {page === "map" && <MapView user={user} />}

      {/* 📜 HISTORY */}
      {page === "history" && <History user={user} />}

      {/* 💳 WALLET */}
      {page === "wallet" && (
        <WalletPage
          user={user}
          userData={userData}
          rechargeAmount={rechargeAmount}
          setRechargeAmount={setRechargeAmount}
        />
      )}

      {/* ⚙️ SETTINGS */}
      {page === "settings" && (
        <div style={{ padding: "20px" }}>
          <h2>⚙️ Settings</h2>

          <div style={glassCard}>
            <h3>
              <User size={16} /> User Info
            </h3>

            <p><b>Name:</b> {userData.name}</p>
            <p><b>Email:</b> {user.email}</p>
            <p><b>Vehicle:</b> {userData.vehicle}</p>
            <p><b>Type:</b> {userData.type}</p>
          </div>

          <button onClick={toggleTheme} style={btnStyle}>
            {dark ? <Sun size={18} /> : <Moon size={18} />} Toggle Theme
          </button>

          <button
            onClick={() => auth.signOut()}
            style={{ ...btnStyle, background: "#ef4444" }}
          >
            Logout
          </button>
        </div>
      )}

      {/* 🔻 NAVBAR */}
      <div style={navBar}>
        <NavBtn icon={<Home size={18} />} onClick={() => setPage("home")} active={page === "home"} />
        <NavBtn icon={<Map size={18} />} onClick={() => setPage("map")} active={page === "map"} />
        <NavBtn icon={<List size={18} />} onClick={() => setPage("history")} active={page === "history"} />
        <NavBtn icon={<Wallet size={18} />} onClick={() => setPage("wallet")} active={page === "wallet"} />
        <NavBtn icon={<Settings size={18} />} onClick={() => setPage("settings")} active={page === "settings"} />
      </div>
    </div>
  );
}

/* 📜 HISTORY (FIXED CLEANUP) */
function History({ user }) {
  const [history, setHistory] = useState([]);
  const db = getDatabase();

  useEffect(() => {
    const historyRef = ref(db, `users/${user.uid}/history`);

    const unsubscribe = onValue(historyRef, (snap) => {
      const data = snap.val();
      if (data) setHistory(Object.values(data));
    });

    return () => unsubscribe();
  }, [user.uid]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>📜 Toll History</h2>

      {history.map((h, i) => (
        <div key={i} style={glassCard}>
          <p>{h.type} - ₹{h.amount}</p>
          <small>{h.time}</small>
        </div>
      ))}
    </div>
  );
}

/* 💳 WALLET (SAFE UPDATE) */
function WalletPage({ user, userData, rechargeAmount, setRechargeAmount }) {
  const db = getDatabase();

  const recharge = () => {
    const amount = parseInt(rechargeAmount);
    if (!amount || amount <= 0) return alert("Invalid amount");

    const walletRef = ref(db, `users/${user.uid}/wallet`);

    onValue(walletRef, (snap) => {
      const current = snap.val() || 0;
      set(walletRef, current + amount);
    }, { onlyOnce: true });

    setRechargeAmount("");
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>💳 Wallet</h2>

      <div style={glassCard}>
        <p>Balance: ₹{userData.wallet || 0}</p>

        <input
          value={rechargeAmount}
          onChange={(e) => setRechargeAmount(e.target.value)}
          placeholder="Amount"
          style={inputStyle}
        />

        <button onClick={recharge} style={btnStyle}>
          Recharge
        </button>
      </div>
    </div>
  );
}

/* 🔻 NAV BUTTON */
function NavBtn({ icon, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...navBtn,
        color: active ? "#22c55e" : "white",
      }}
    >
      {icon}
    </button>
  );
}

/* 🎨 STYLES */
const walletCard = {
  padding: "25px",
  borderRadius: "20px",
  background: "#6366f1",
};

const btnStyle = {
  marginTop: "20px",
  padding: "14px",
  borderRadius: "12px",
  background: "#22c55e",
  color: "white",
  width: "100%",
  cursor: "pointer",
  border: "none",
};

const inputStyle = {
  padding: "10px",
  marginTop: "10px",
  borderRadius: "8px",
  width: "100%",
  border: "none",
};

const glassCard = {
  background: "rgba(255,255,255,0.1)",
  padding: "15px",
  borderRadius: "15px",
  marginTop: "15px",
};

const navBar = {
  position: "fixed",
  bottom: 10,
  left: 10,
  right: 10,
  display: "flex",
  justifyContent: "space-around",
  background: "#1e293b",
  padding: "10px",
  borderRadius: "20px",
};

const navBtn = {
  background: "none",
  border: "none",
  cursor: "pointer",
};

export default App;