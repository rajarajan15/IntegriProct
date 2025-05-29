// let isCopyPasteTracking = false;
// let tempCopyCount = 0; // Temporary variable for copy count
// let tempPasteCount = 0; // Temporary variable for paste count

// export function startCopyPasteTracking() {
//   if (isCopyPasteTracking) return;
//   isCopyPasteTracking = true;

//   const handleCopy = () => {
//     const logMessage = `📋 Copy detected at ${new Date().toLocaleTimeString()}`;
//     console.log(logMessage);

//     // Increment temporary copy count
//     tempCopyCount++;
//     storeLog("copy", logMessage);
//   };

//   const handlePaste = () => {
//     const logMessage = `📋 Paste detected at ${new Date().toLocaleTimeString()}`;
//     console.log(logMessage);

//     // Increment temporary paste count
//     tempPasteCount++;
//     storeLog("paste", logMessage);
//   };

//   document.addEventListener("copy", handleCopy);
//   document.addEventListener("paste", handlePaste);

//   console.log("Copy-paste detection started");

//   // Store the event handlers globally for easy cleanup later
//   (window as any)._copyHandler = handleCopy;
//   (window as any)._pasteHandler = handlePaste;
// }

// export function stopCopyPasteTracking() {
//   if (!isCopyPasteTracking) return;
//   isCopyPasteTracking = false;

//   // Remove the event listeners
//   document.removeEventListener("copy", (window as any)._copyHandler);
//   document.removeEventListener("paste", (window as any)._pasteHandler);

//   console.log("Copy-paste detection stopped");

//   // Optionally, store the temporary count data in localStorage or make an API call
//   // (For now, the temporary count will not be persisted until the task is completed)
//   console.log(`Temporary Copy Count: ${tempCopyCount}`);
//   console.log(`Temporary Paste Count: ${tempPasteCount}`);

//   // You can store them when the user completes the task or returns from it
//   localStorage.setItem("copyCount", tempCopyCount.toString());
//   localStorage.setItem("pasteCount", tempPasteCount.toString());
// }

// function storeLog(type: "copy" | "paste", logMessage: string) {
//   const existingLogs = JSON.parse(localStorage.getItem("proctorLogs") || "[]");
//   existingLogs.push(logMessage);
//   localStorage.setItem("proctorLogs", JSON.stringify(existingLogs));
// }

//Alert Messages
let isCopyPasteTracking = false;
let tempCopyCount = 0; // Temporary variable for copy count
let tempPasteCount = 0; // Temporary variable for paste count

export function startCopyPasteTracking() {
  if (isCopyPasteTracking) return;
  isCopyPasteTracking = true;

  const handleCopy = () => {
    const logMessage = `📋 Copy detected at ${new Date().toLocaleTimeString()}`;
    console.log(logMessage);

    // ✅ Show alert on copy
    alert("⚠️ Copy action detected! This action is being monitored.");

    // Increment temporary copy count
    tempCopyCount++;
    storeLog("copy", logMessage);
  };

  const handlePaste = () => {
    const logMessage = `📋 Paste detected at ${new Date().toLocaleTimeString()}`;
    console.log(logMessage);

    // ✅ Show alert on paste
    alert("⚠️ Paste action detected! This action is being monitored.");

    // Increment temporary paste count
    tempPasteCount++;
    storeLog("paste", logMessage);
  };

  document.addEventListener("copy", handleCopy);
  document.addEventListener("paste", handlePaste);

  console.log("Copy-paste detection started");

  // Store the event handlers globally for easy cleanup later
  (window as any)._copyHandler = handleCopy;
  (window as any)._pasteHandler = handlePaste;
}

export function stopCopyPasteTracking() {
  if (!isCopyPasteTracking) return;
  isCopyPasteTracking = false;

  // Remove the event listeners
  document.removeEventListener("copy", (window as any)._copyHandler);
  document.removeEventListener("paste", (window as any)._pasteHandler);

  console.log("Copy-paste detection stopped");

  // Optionally, store the temporary count data in localStorage or make an API call
  console.log(`Temporary Copy Count: ${tempCopyCount}`);
  console.log(`Temporary Paste Count: ${tempPasteCount}`);

  localStorage.setItem("copyCount", tempCopyCount.toString());
  localStorage.setItem("pasteCount", tempPasteCount.toString());
}

function storeLog(type: "copy" | "paste", logMessage: string) {
  const existingLogs = JSON.parse(localStorage.getItem("proctorLogs") || "[]");
  existingLogs.push(logMessage);
  localStorage.setItem("proctorLogs", JSON.stringify(existingLogs));
}
