"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
    });
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
      <button onClick={handleLogin} className="bg-black text-white p-2">
        Login
      </button>
      <p style={{ marginTop: "10px" }}>
        Don’t have an account?{" "}
        <Link href="/register" style={{ color: "blue" }}>
          Register here
        </Link>
      </p>
    </div>
    
  );
}