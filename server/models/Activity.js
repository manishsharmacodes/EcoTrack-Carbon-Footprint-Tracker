const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: String,
    required: true,
    enum: ['transport', 'electricity', 'food', 'shopping']
  },
  subcategory: {
    type: String,
    required: true
  },
  details: {
    distance: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    fuelType: { type: String, default: '' },
    mealType: { type: String, default: '' }
  },
  carbonEmission: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient date-range queries
activitySchema.index({ userId: 1, date: -1 });
activitySchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Activity', activitySchema);
