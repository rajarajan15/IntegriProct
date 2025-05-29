// webcamTracking.ts

let isWebcamTracking = false;
let webcamStream: MediaStream | null = null;
let webcamStartTime: number | null = null;
let totalWebcamTimeMs = 0;

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

// Start Webcam Tracking
export async function startWebcamTracking(videoElement?: HTMLVideoElement) {
  console.log("🎬 Starting Webcam Tracking...");

  if (isWebcamTracking) {
    console.log("⚠️ Webcam tracking already active.");
    return;
  }
  isWebcamTracking = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 } }
    });

    webcamStream = stream;
    webcamStartTime = Date.now();

    if (videoElement) {
      videoElement.srcObject = stream;

      console.log("⏳ Waiting for webcam video to load...");

      videoElement.onloadedmetadata = async () => {
        console.log("▶️ Video metadata loaded");

        try {
          await videoElement.play();
          console.log("▶️ Video is now playing");

          // Style the video element for visibility
          videoElement.style.position = "fixed";
          videoElement.style.top = "10px";
          videoElement.style.left = "10px";
          videoElement.style.width = "320px";
          videoElement.style.height = "240px";
          videoElement.style.zIndex = "9999";
        } catch (playError) {
          console.error("❌ Error while playing video:", playError);
        }
      };
    }

    // Initialize Media Recorder
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `proctoring-video-${new Date().toISOString()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    mediaRecorder.start();
    console.log("🎥 Recording started");

  } catch (err) {
    console.error("❌ Error accessing webcam:", err);
    alert("Please allow webcam permission!");
    isWebcamTracking = false;
  }
}

// Stop Webcam Tracking
export function stopWebcamTracking() {
  console.log("🛑 Stopping Webcam Tracking");

  if (!isWebcamTracking) {
    console.log("⚠️ Webcam tracking not active.");
    return;
  }

  isWebcamTracking = false;

  if (webcamStartTime) {
    const duration = Date.now() - webcamStartTime;
    totalWebcamTimeMs += duration;
    webcamStartTime = null;

    const seconds = Math.floor(duration / 1000);
    const logMessage = `📷 Webcam stopped. Duration: ${seconds} seconds`;
    console.log(logMessage);
    storeLog(logMessage);
  }

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
  }

  localStorage.setItem("totalWebcamTimeMs", totalWebcamTimeMs.toString());
}

// Helper to store logs in localStorage
function storeLog(message: string) {
  const logs = JSON.parse(localStorage.getItem("proctorLogs") || "[]");
  logs.push(message);
  localStorage.setItem("proctorLogs", JSON.stringify(logs));
}
