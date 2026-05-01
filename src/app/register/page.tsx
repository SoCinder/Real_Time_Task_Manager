"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    window.location.href = "/login";
  };

  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto mt-20">
      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2"
      />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2"
      />
      <button onClick={handleRegister} className="bg-black text-white p-2">
        Register
      </button>
    </div>
  );
}