import Link from "next/link";
import { testValue } from "@/lib/test"; // your alias test

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold">TaskFlow</h1>

      <p className="text-gray-600">Test: {testValue}</p>

      <Link href="/dashboard" className="text-blue-500 underline">
        Go to Dashboard
      </Link>
    </main>
  );
}