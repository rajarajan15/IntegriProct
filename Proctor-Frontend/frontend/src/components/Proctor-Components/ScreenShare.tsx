let isScreenSharing = false;
let screenShareStream: MediaStream | null = null;
let screenStartTime: number | null = null;
let totalScreenShareTimeMs = 0;

export async function startScreenShareTracking(): Promise<void> {
  if (isScreenSharing) {
    alert("Screen sharing is already active.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

    isScreenSharing = true;
    screenShareStream = stream;
    screenStartTime = Date.now();

    const startLog = `🖥️ Screen sharing started at ${new Date().toLocaleTimeString()}`;
    console.log(startLog);
    storeLog(startLog);

    // ✅ Listen for manual stop via browser/system
    const [track] = stream.getVideoTracks();
    track.addEventListener("ended", () => {
      stopScreenShareTracking(true); // pass true to indicate user manually stopped it
    });

    return Promise.resolve();
  } catch (err) {
    console.error("❌ Screen share permission denied:", err);
    isScreenSharing = false;
    return Promise.reject(err);
  }
}

export function stopScreenShareTracking(triggeredByUser = false): void {
  if (!isScreenSharing) return;

  isScreenSharing = false;

  if (screenStartTime) {
    const duration = Date.now() - screenStartTime;
    totalScreenShareTimeMs += duration;
    screenStartTime = null;

    const seconds = Math.floor(duration / 1000);
    const stopLog = triggeredByUser
      ? `🛑 User stopped screen sharing. Duration: ${seconds} seconds`
      : `🛑 Screen sharing stopped programmatically. Duration: ${seconds} seconds`;

    console.log(stopLog);
    storeLog(stopLog);
  }

  if (screenShareStream) {
    screenShareStream.getTracks().forEach((track) => track.stop());
    screenShareStream = null;
  }

  localStorage.setItem("totalScreenShareTimeMs", totalScreenShareTimeMs.toString());
}

function storeLog(message: string): void {
  const existingLogs = JSON.parse(localStorage.getItem("proctorLogs") || "[]");
  existingLogs.push(message);
  localStorage.setItem("proctorLogs", JSON.stringify(existingLogs));
}
// let isScreenSharing = false;
// let screenShareStream: MediaStream | null = null;
// let screenStartTime: number | null = null;
// let totalScreenShareTimeMs = 0;

// // 🚀 Listen for shortcut key globally
// document.addEventListener("keydown", (event) => {
//   if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "s") {
//     console.log("⌨️ Shortcut pressed: Ctrl + Shift + S");
//     startScreenShareTracking();
//   }
// });

// export async function startScreenShareTracking(): Promise<void> {
//   if (isScreenSharing) {
//     alert("Screen sharing is already active.");
//     return;
//   }

//   try {
//     const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

//     isScreenSharing = true;
//     screenShareStream = stream;
//     screenStartTime = Date.now();

//     const startLog = `🖥️ Screen sharing started at ${new Date().toLocaleTimeString()}`;
//     console.log(startLog);
//     storeLog(startLog);

//     const [track] = stream.getVideoTracks();
//     track.addEventListener("ended", () => {
//       stopScreenShareTracking(true); // User manually stopped screen share
//     });

//     return Promise.resolve();
//   } catch (err) {
//     console.error("❌ Screen share permission denied:", err);
//     isScreenSharing = false;
//     return Promise.reject(err);
//   }
// }

// export function stopScreenShareTracking(triggeredByUser = false): void {
//   if (!isScreenSharing) return;

//   isScreenSharing = false;

//   if (screenStartTime) {
//     const duration = Date.now() - screenStartTime;
//     totalScreenShareTimeMs += duration;
//     screenStartTime = null;

//     const seconds = Math.floor(duration / 1000);
//     const stopLog = triggeredByUser
//       ? `🛑 User stopped screen sharing. Duration: ${seconds} seconds`
//       : `🛑 Screen sharing stopped programmatically. Duration: ${seconds} seconds`;

//     console.log(stopLog);
//     storeLog(stopLog);
//   }

//   if (screenShareStream) {
//     screenShareStream.getTracks().forEach((track) => track.stop());
//     screenShareStream = null;
//   }

//   localStorage.setItem("totalScreenShareTimeMs", totalScreenShareTimeMs.toString());
// }

// function storeLog(message: string): void {
//   const existingLogs = JSON.parse(localStorage.getItem("proctorLogs") || "[]");
//   existingLogs.push(message);
//   localStorage.setItem("proctorLogs", JSON.stringify(existingLogs));
// }
