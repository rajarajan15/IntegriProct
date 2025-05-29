const mongoose = require('mongoose');

// Define the schema for Proctors
const proctorSchema = new mongoose.Schema(
  {
    module_id: {
      type: String,  // String to store the module ID
      required: true,  // Ensure the module_id is always present
    },
    proctors: {
      type: [String],  // Array of strings to store the proctors
      required: true,  // Ensure the proctors array is always present
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create the model from the schema
const Proctor = mongoose.model('Proctor', proctorSchema);

module.exports = Proctor;
