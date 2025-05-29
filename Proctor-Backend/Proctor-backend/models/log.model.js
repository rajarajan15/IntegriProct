const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Proctoring log schema to track proctoring-related activities
const proctoringLogSchema = new Schema({
    userId: { type: String, required: true },
    moduleId: { type: String, required: true },
    voiceDetectionCount: { type: Number, default: 0 },
    totalVoiceTimeMs: { type: Number, default: 0 }, // Total voice time in milliseconds
    copyCount: { type: Number, default: 0 },
    pasteCount: { type: Number, default: 0 },
    tabSwitchCount: { type: Number, default: 0 }, // Tab switch count
    submitted: { type: Boolean, default: false }, // Flag to indicate if the exam has been submitted
    proctorLogs: { type: [String], default: [] }, // List of proctor logs (e.g., "Tab switch detected", "Voice detected", etc.)
});

module.exports = mongoose.model('ProctoringLog', proctoringLogSchema);