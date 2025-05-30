# IntegriProct - Assessment Proctoring System
### IntegriProct is a smart and flexible exam proctoring system designed for digital classroom environments. It offers rule-based and AI-powered proctoring features to maintain test integrity and support both teachers and students.

## Technology Used
### Next.js 
### Node.js 
### Express.js 
### Python 
### MongoDB

## Features
### 1. Rule-Based Proctoring – Core Monitoring
  Detects and logs copy-paste actions.
  Tracks tab switches with timestamps.
  Records webcam video during exams for review.
  Logs screen activity throughout the test.
  Proctoring can be enabled per test (e.g., only for quizzes/exams).

### 2. Per-Test Proctoring Customization
  Teachers can customize proctoring settings for each assessment.
  Example: Enable webcam + tab switch for final exams; restrict copy-paste for quizzes.
  Provides flexibility and scalability for real-world classroom scenarios.

### 3. Resumable Test Experience
  Auto-saves progress locally during internet/power failures.
  Allows students to resume tests from where they left off.
  Ensures fairness, especially in low-connectivity areas.

### 4. AI-Powered Proctoring – Smart Detection
  Detects multiple faces in webcam feed.
  Monitors voices to flag multiple speakers.
  (Proof of Concept) Eye Gaze Tracking to detect off-screen focus.

### 5. Live Teacher Dashboard
  Real-time monitoring interface for teachers.
  Displays live webcam feed and screen activity.
  Provides instant alerts for suspicious behavior.
  Live event logging (e.g., tab switches, audio spikes).

### 6. Cheating Analysis & Test Results
  Calculates a Cheating Probability Score based on activity logs.
  Generates detailed proctoring reports for each student.
  Displays test results along with integrity rating (Low / Medium / High suspicion).
