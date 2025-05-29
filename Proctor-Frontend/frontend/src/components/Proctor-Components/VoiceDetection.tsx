let isVoiceTracking = false;
let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;

let voiceStartTime: number | null = null;
let voiceActive = false;
let voiceDetectionCount = 0; // Initialize voice detection count

// Temporary variables to store voice detection data
let tempVoiceDetectionCount = 0;
let tempTotalVoiceTimeMs = 0;

export async function SettodefaultVoiceDetection() { 
  voiceDetectionCount = 0; // Reset voice detection count
  tempVoiceDetectionCount = 0;
  tempTotalVoiceTimeMs = 0;

  // Set the defaults in localStorage as well
  localStorage.setItem("tempVoiceDetectionCount", "0");
  localStorage.setItem("tempTotalVoiceTimeMs", "0");
  localStorage.setItem("voiceDetectionCount", "0"); // Ensure it's reset in localStorage too
}

export async function startVoiceDetection() {
  if (isVoiceTracking) return;
  isVoiceTracking = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStream = stream;

    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const detectVoice = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Increase the threshold value to filter out mild sounds
      const volume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;

      // Use a higher threshold to detect only louder noises (e.g., 100 or 150)
      const threshold = 100; // Adjust the threshold as needed

      if (volume > threshold) {
        if (!voiceActive) {
          voiceStartTime = Date.now();
          voiceActive = true;
          console.log(`🎙️ Loud noise started at ${new Date().toLocaleTimeString()}`);
        }

        const logMessage = `🎙️ Loud noise detected at ${new Date().toLocaleTimeString()}`;
        const existingLogs = JSON.parse(localStorage.getItem("proctorLogs") || "[]");
        existingLogs.push(logMessage);
        localStorage.setItem("proctorLogs", JSON.stringify(existingLogs));

        // Increment voice detection count and store temporarily
        tempVoiceDetectionCount++;
        localStorage.setItem("tempVoiceDetectionCount", tempVoiceDetectionCount.toString());

        // Also update the overall voice detection count in localStorage
        voiceDetectionCount++;
        localStorage.setItem("voiceDetectionCount", voiceDetectionCount.toString());
      } else if (voiceActive) {
        // Noise stopped
        const duration = Date.now() - (voiceStartTime || 0);
        tempTotalVoiceTimeMs += duration; // Temporarily store total voice time

        const durationSeconds = Math.round(duration / 1000);
        console.log(`🔇 Loud noise stopped. Duration: ${durationSeconds} seconds`);

        voiceActive = false;
        voiceStartTime = null;

        localStorage.setItem("tempTotalVoiceTimeMs", tempTotalVoiceTimeMs.toString());
      }

      if (isVoiceTracking) {
        requestAnimationFrame(detectVoice);
      }
    };

    detectVoice();
    console.log("Voice detection started. Waiting for loud noise...");

  } catch (err) {
    alert("Microphone access denied. Voice detection requires permission.");
    console.error("Voice detection error:", err);
    isVoiceTracking = false;
  }
}


export async function stopVoiceDetection() {
  isVoiceTracking = false;

  // Final noise duration if user stops mid-detection
  if (voiceActive && voiceStartTime !== null) {
    const duration = Date.now() - voiceStartTime;
    tempTotalVoiceTimeMs += duration; // Add to temporary total time
    localStorage.setItem("tempTotalVoiceTimeMs", tempTotalVoiceTimeMs.toString());
    voiceActive = false;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  console.log(`Voice detection stopped. Total voice time: ${Math.round(tempTotalVoiceTimeMs / 1000)} seconds`);

  // Set the voice detection count and total time in localStorage as well
  localStorage.setItem("voiceDetectionCount", voiceDetectionCount.toString());
  localStorage.setItem("tempVoiceDetectionCount", tempVoiceDetectionCount.toString());

  // No saving to the backend here, this will be handled by the button click event
}
