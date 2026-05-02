"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const register = async () => {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      // ✅ redirect back to login after success
      router.push("/login");
    } else {
      alert("User already exists or error occurred");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Register</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: "10px" }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: "10px" }}
      />

      <button onClick={register}>Create Account</button>

      {/* 🔙 Back to login */}
      <p style={{ marginTop: "10px" }}>
        Already have an account?{" "}
        <button onClick={() => router.push("/login")}>
          Go to Login
        </button>
      </p>
    </div>
  );
}