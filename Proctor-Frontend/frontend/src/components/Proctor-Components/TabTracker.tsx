// let isTracking = false;
// let blurTimestamp: number | null = null;

// // Temporary variable for tab switch count
// let tempTabSwitchCount = 0;

// // Initialize tab switch counts from localStorage (if they exist)
// let tabSwitchCount = parseInt(localStorage.getItem("tabSwitchCount") || "0");

// export function startTabTracking() {
//   if (isTracking) return;
//   isTracking = true;

//   console.log("Tab switching restriction activated");

//   window.addEventListener("blur", handleBlur);
//   window.addEventListener("focus", handleFocus);
// }

// // Reset the tab switch counts
// export function setdefaulttabSwitchCount() {
//   tempTabSwitchCount = 0;
//   tabSwitchCount = 0;
//   // Optionally, update the localStorage to reflect the reset
//   localStorage.setItem("tabSwitchCount", tabSwitchCount.toString());
//   localStorage.setItem("tempTabSwitchCount", tempTabSwitchCount.toString());
// }

// // Handle the blur event (when the tab is switched away)
// function handleBlur() {
//   blurTimestamp = Date.now();
// }

// // Handle the focus event (when the tab comes back into focus)
// function handleFocus() {
//   if (blurTimestamp !== null) {
//     const now = Date.now();
//     const durationMs = now - blurTimestamp;
//     const seconds = Math.floor((durationMs / 1000) % 60);
//     const minutes = Math.floor(durationMs / 60000);

//     const logMessage = `⏳ Tab switched for ${minutes}m ${seconds}s at ${new Date().toLocaleTimeString()}`;
//     console.log(logMessage);

//     const existingLogs = JSON.parse(localStorage.getItem("proctorLogs") || "[]");
//     existingLogs.push(logMessage);
//     localStorage.setItem("proctorLogs", JSON.stringify(existingLogs));

//     // Increment temporary tab switch count
//     tempTabSwitchCount++;
//     console.log(`Temporary Tab Switch Count: ${tempTabSwitchCount}`);

//     // Increment and store the permanent tab switch count
//     tabSwitchCount++;
//     localStorage.setItem("tabSwitchCount", tabSwitchCount.toString());

//     blurTimestamp = null; // reset
//   }
// }

// // Stop tab tracking (cleanup)
// export function stopTabTracking() {
//   if (!isTracking) return;
//   isTracking = false;

//   console.log("Tab switching restriction deactivated");

//   // Remove the event listeners when tab tracking is stopped
//   window.removeEventListener("blur", handleBlur);
//   window.removeEventListener("focus", handleFocus);

//   // Optionally, store the temporary count data in localStorage or make an API call
//   console.log(`Temporary Tab Switch Count: ${tempTabSwitchCount}`);

//   // Optionally store the counts in localStorage or send them to the backend when the task is completed
//   localStorage.setItem("tabSwitchCount", tempTabSwitchCount.toString());
// }

//Alert Messages
let isTracking = false;
let blurTimestamp: number | null = null;

// Temporary variable for tab switch count
let tempTabSwitchCount = 0;

// Initialize tab switch counts from localStorage (if they exist)
let tabSwitchCount = parseInt(localStorage.getItem("tabSwitchCount") || "0");

// 🆕 New variable to skip initial permission focus/blur
let ignoreNextFocus = true;

export function startTabTracking() {
  if (isTracking) return;
  isTracking = true;

  console.log("Tab switching restriction activated");

  window.addEventListener("blur", handleBlur);
  window.addEventListener("focus", handleFocus);
}

// Reset the tab switch counts
export function setdefaulttabSwitchCount() {
  tempTabSwitchCount = 0;
  tabSwitchCount = 0;
  localStorage.setItem("tabSwitchCount", tabSwitchCount.toString());
  localStorage.setItem("tempTabSwitchCount", tempTabSwitchCount.toString());
}

// Handle the blur event (when the tab is switched away)
function handleBlur() {
  blurTimestamp = Date.now();
}

// Handle the focus event (when the tab comes back into focus)
function handleFocus() {
  if (ignoreNextFocus) {
    console.log("🔄 Initial focus after permission prompt ignored.");
    ignoreNextFocus = false;
    blurTimestamp = null; // Reset because we ignored it
    return;
  }

  if (blurTimestamp !== null) {
    const now = Date.now();
    const durationMs = now - blurTimestamp;
    const seconds = Math.floor((durationMs / 1000) % 60);
    const minutes = Math.floor(durationMs / 60000);

    const logMessage = `⏳ Tab switched for ${minutes}m ${seconds}s at ${new Date().toLocaleTimeString()}`;
    console.log(logMessage);

    const existingLogs = JSON.parse(localStorage.getItem("proctorLogs") || "[]");
    existingLogs.push(logMessage);
    localStorage.setItem("proctorLogs", JSON.stringify(existingLogs));

    tempTabSwitchCount++;
    console.log(`Temporary Tab Switch Count: ${tempTabSwitchCount}`);

    tabSwitchCount++;
    localStorage.setItem("tabSwitchCount", tabSwitchCount.toString());

    blurTimestamp = null; // reset
  }
}

// Stop tab tracking (cleanup)
export function stopTabTracking() {
  if (!isTracking) return;
  isTracking = false;

  console.log("Tab switching restriction deactivated");

  window.removeEventListener("blur", handleBlur);
  window.removeEventListener("focus", handleFocus);

  console.log(`Temporary Tab Switch Count: ${tempTabSwitchCount}`);

  localStorage.setItem("tabSwitchCount", tempTabSwitchCount.toString());
}

