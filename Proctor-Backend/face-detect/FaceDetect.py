import cv2
import tkinter as tk
from tkinter import messagebox

def ask_camera_permission():
    """Ask user permission to access the camera."""
    root = tk.Tk()
    root.withdraw()  # Hide the main tkinter window
    response = messagebox.askyesno("Camera Access", "📷 Allow access to your camera?")
    return response

def start_webcam():
    """Start the webcam and perform face detection."""
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("❌ Error: Could not open webcam.")
        return

    print("✅ Webcam started! Press 'q' to quit.")

    previous_faces = -1

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Failed to grab frame.")
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        num_faces = len(faces)

        if num_faces != previous_faces:
            previous_faces = num_faces
            if num_faces >= 2:
                print(f"\n🚨 ALERT: {num_faces} faces detected! 🚨")
            else:
                print(f"\n✅ Faces detected: {num_faces}")

        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)

        text_color = (0, 255, 0) if num_faces <= 1 else (0, 0, 255)
        cv2.putText(frame, f'Faces: {num_faces}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX,
                    1, text_color, 2, cv2.LINE_AA)

        cv2.imshow('Face Detection (Press q to Quit)', frame)

        # Check if 'q' is pressed
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\n👋 Quitting webcam...")
            close_webcam(cap)
            break  # Make sure to break after closing

    # No need to call close_webcam() here anymore.

def close_webcam(cap):
    """Safely release the webcam and close all windows."""
    if cap.isOpened():
        cap.release()
    cv2.destroyAllWindows()
    print("✅ Camera closed.")

# --- Main Program ---
if __name__ == "__main__":
    if ask_camera_permission():
        start_webcam()
    else:
        print("🚫 Camera access denied. Exiting...")
