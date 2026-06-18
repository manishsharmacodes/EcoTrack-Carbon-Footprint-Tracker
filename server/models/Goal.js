const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['overall', 'transport', 'electricity', 'food', 'shopping'],
    default: 'overall'
  },
  targetReduction: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  baselineEmission: {
    type: Number,
    required: true
  },
  currentEmission: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'paused'],
    default: 'active'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Goal', goalSchema);
