const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const url = 'mongodb+srv://rajarajanshrihari:rajarajan15@database1.ubh3w.mongodb.net/';

const app = express(); // Use express() for the main application
const router = express.Router(); // Use express.Router() for modular routes

const Proctor = require('./models/module_proctors.model'); // Import the Proctor model
const ProctoringLog = require('./models/log.model'); // Import the ProctoringLog model

app.use(bodyParser.json({ limit: '80mb' }));

mongoose.connect(url);
const con = mongoose.connection;

con.on('open', () => {
    console.log('connected');
});

app.use(cors());
app.use(bodyParser.json());

app.post('/save_proctors', async (req, res) => {
    const { module_id, proctors } = req.body;

    try {
        // Check if the proctors for the module already exist
        const existingProctor = await Proctor.findOne({ module_id });

        if (existingProctor) {
            // If proctors exist, update them
            existingProctor.proctors = proctors;
            await existingProctor.save();
            return res.status(200).json({ message: 'Proctors updated successfully' });
        }

        // If no proctors exist, create a new entry
        const newProctor = new Proctor({ module_id, proctors });
        await newProctor.save();

        res.status(200).json({ message: 'Proctors saved successfully' });
    } catch (err) {
        console.error('Error saving proctors:', err);
        res.status(500).json({ message: 'Error saving proctors' });
    }
});

// GET API to fetch proctors for a specific module
app.get('/get_proctors/:module_id', async (req, res) => {
    const { module_id } = req.params;

    try {
        const proctor = await Proctor.findOne({ module_id });

        if (!proctor) {
            return res.status(404).json({ message: 'Proctors not found for this module' });
        }

        res.status(200).json(proctor);
    } catch (err) {
        console.error('Error fetching proctors:', err);
        res.status(500).json({ message: 'Error fetching proctors' });
    }
});

app.get('/get_proctors', async (req, res) => {
    try {
        const proctor = await Proctor.find();
        console.log(proctor);
        if (!proctor) {
            return res.status(404).json({ message: 'Proctors not found for this module' });
        }
        res.status(200).json(proctor);
    } catch (err) {
        console.error('Error fetching proctors:', err);
        res.status(500).json({ message: 'Error fetching proctors' });
    }
});

// PUT API to update proctors for a specific module
app.put('/update_proctors/:module_id', async (req, res) => {
    const { module_id } = req.params;
    const { proctors } = req.body;

    try {
        const existingProctor = await Proctor.findOne({ module_id });

        if (!existingProctor) {
            return res.status(404).json({ message: 'Proctors not found for this module' });
        }

        // Update proctors list
        existingProctor.proctors = proctors;
        await existingProctor.save();

        res.status(200).json({ message: 'Proctors updated successfully' });
    } catch (err) {
        console.error('Error updating proctors:', err);
        res.status(500).json({ message: 'Error updating proctors' });
    }
});

app.post('/save_proctor_logs', async (req, res) => {
    const { userId, moduleId, newLogs } = req.body;

    try {
        // Find existing proctor log for the user and module
        const existingLog = await ProctoringLog.findOne({ userId, moduleId });

        if (existingLog) {
            // If logs exist, update them
            existingLog.voiceDetectionCount += newLogs.voiceDetectionCount || 0;
            existingLog.totalVoiceTimeMs += newLogs.totalVoiceTimeMs || 0;
            existingLog.copyCount += newLogs.copyCount || 0;
            existingLog.pasteCount += newLogs.pasteCount || 0;
            existingLog.tabSwitchCount += newLogs.tabSwitchCount || 0;
            existingLog.proctorLogs.push(...newLogs.proctorLogs);

            // If the exam is marked as submitted, update the flag
            if (newLogs.submitted) {
                existingLog.submitted = true;
            }

            await existingLog.save();
            return res.status(200).json({ message: 'Proctor logs updated successfully' });
        }

        // If no logs exist, create a new entry
        const newProctoringLog = new ProctoringLog({
            userId,
            moduleId,
            voiceDetectionCount: newLogs.voiceDetectionCount || 0,
            totalVoiceTimeMs: newLogs.totalVoiceTimeMs || 0,
            copyCount: newLogs.copyCount || 0,
            pasteCount: newLogs.pasteCount || 0,
            tabSwitchCount: newLogs.tabSwitchCount || 0,
            proctorLogs: newLogs.proctorLogs || [],
            submitted: newLogs.submitted || false
        });

        await newProctoringLog.save();
        res.status(200).json({ message: 'Proctor logs saved successfully' });
    } catch (err) {
        console.error('Error saving proctor logs:', err);
        res.status(500).json({ message: 'Error saving proctor logs' });
    }
});


// GET API to fetch proctor logs for a specific user and module
app.get('/get_proctor_logs/:userId/:moduleId', async (req, res) => {
    const { userId, moduleId } = req.params;

    try {
        const logs = await ProctoringLog.findOne({ userId, moduleId });
        if (!logs) {
            return res.status(404).json({ message: 'Proctor logs not found for this user and module' });
        }

        res.status(200).json(logs);
    } catch (err) {
        console.error('Error fetching proctor logs:', err);
        res.status(500).json({ message: 'Error fetching proctor logs' });
    }
});

app.get('/get_all_proctor_logs', async (req, res) => {
    try {
        const logs = await ProctoringLog.find({ submitted: true });
        res.status(200).json(logs);
    } catch (err) {
        console.error('Error fetching proctor logs:', err);
        res.status(500).json({ message: 'Error fetching proctor logs' });
    }
});



app.put('/update_proctor_logs/:userId/:moduleId', async (req, res) => {
    const { userId, moduleId } = req.params;
    const { newLogs } = req.body;

    try {
        const existingLog = await ProctoringLog.findOne({ userId, moduleId });

        if (!existingLog) {
            return res.status(404).json({ message: 'Proctor logs not found for this user and module' });
        }

        // Update proctor logs
        existingLog.voiceDetectionCount += newLogs.voiceDetectionCount || 0;
        existingLog.totalVoiceTimeMs += newLogs.totalVoiceTimeMs || 0;
        existingLog.copyCount += newLogs.copyCount || 0;
        existingLog.pasteCount += newLogs.pasteCount || 0;
        existingLog.tabSwitchCount += newLogs.tabSwitchCount || 0;
        existingLog.proctorLogs.push(...newLogs.proctorLogs);

        // If the exam is marked as submitted, update the flag
        if (newLogs.submitted !== undefined) {
            existingLog.submitted = newLogs.submitted;
        }

        await existingLog.save();
        res.status(200).json({ message: 'Proctor logs updated successfully' });
    } catch (err) {
        console.error('Error updating proctor logs:', err);
        res.status(500).json({ message: 'Error updating proctor logs' });
    }
});


// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});