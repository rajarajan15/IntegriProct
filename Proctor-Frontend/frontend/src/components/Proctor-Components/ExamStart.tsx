"use client";

import { useEffect, useState } from "react";

declare const chrome: any;

export default function ExamStartPage() {
  const [extensionInstalled, setExtensionInstalled] = useState(false);

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      try {
        chrome.runtime.sendMessage(
          "llfdaleknghepofjcleahemgndnaghhk", // ✅ Your extension ID
          { type: "CHECK_EXTENSION" },
          (response: any) => {
            if (chrome.runtime.lastError || !response) {
              console.error("❌ Extension not detected:", chrome.runtime.lastError);
              setExtensionInstalled(false);
              alert("⚠️ AI Blocker Extension not detected! Please install before starting the test.");
            } else {
              console.log("✅ Extension is active");
              setExtensionInstalled(true);
              alert("✅ AI Blocker Extension detected! You may proceed with the test.");
            }
          }
        );
      } catch (error) {
        console.error("❌ Error checking extension:", error);
        setExtensionInstalled(false);
        alert("⚠️ Extension check failed. Please install the extension.");
      }
    } else {
      console.error("❌ Chrome API not available.");
      setExtensionInstalled(false);
      alert("⚠️ Chrome environment not detected. Please use a supported browser.");
    }
  }, []);

  const handleStartTest = () => {
    if (!extensionInstalled) {
      alert("⚠️ Please install the AI Blocker Extension before starting the test!");
      return;
    }
    console.log("🚀 Starting the test...");
    // ✅ Redirect to test page
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to the Exam Portal</h1>

      {extensionInstalled ? (
        <p className="text-green-600 font-semibold mb-4">
          ✅ AI Blocker Extension is active. You may proceed.
        </p>
      ) : (
        <p className="text-red-600 font-semibold mb-4">
          ❌ AI Blocker Extension not detected. Please install before starting.
        </p>
      )}

      <button
        onClick={handleStartTest}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
      >
        Start Test
      </button>
    </div>
  );
}
