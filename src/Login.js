import { useState } from "react";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";

function Login({ setUser }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [type, setType] = useState("Car");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const auth = getAuth();
  const db = getDatabase();

  const handleLogin = async () => {
    if (!email || !password) return alert("Enter email & password");
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCred.user);
    } catch (err) { alert(err.message); }
  };

  const handleSignup = async () => {
    if (!email || !password || !name || !vehicle) return alert("Fill all details");
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      await set(ref(db, `users/${uid}`), {
        name,
        vehicle: vehicle.toUpperCase(),
        type,
        phone,
        wallet: 300
      });
      setUser(userCred.user);
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px", fontFamily: "Inter", color: "white" }}>
      <h2>🚗 GPS Toll Login</h2>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} /><br/>
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} /><br/>
      <hr style={{width: "250px", opacity: 0.2}} />
      <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} /><br/>
      <input placeholder="Vehicle Number" value={vehicle} onChange={(e) => setVehicle(e.target.value)} style={inputStyle} /><br/>
      <input placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} /><br/>
      <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
        <option>Car</option><option>Bike</option><option>Truck</option><option>Bus</option>
      </select><br/>
      <button onClick={handleLogin} style={btnStyle}>Login</button>
      <button onClick={handleSignup} style={{ ...btnStyle, background: "#3b82f6" }}>Sign Up</button>
    </div>
  );
}

const inputStyle = { padding: "12px", margin: "8px", borderRadius: "8px", border: "1px solid #ccc", width: "250px" };
const btnStyle = { padding: "12px 25px", borderRadius: "10px", border: "none", background: "#22c55e", color: "white", margin: "10px", cursor: "pointer" };

export default Login;