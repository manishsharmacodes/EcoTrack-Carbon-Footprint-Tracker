const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['tip', 'reminder', 'achievement', 'milestone', 'warning'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '💡'
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto-cleanup old notifications (keep last 50)
notificationSchema.statics.cleanupOld = async function(userId) {
  const count = await this.countDocuments({ userId });
  if (count > 50) {
    const oldest = await this.find({ userId })
      .sort({ createdAt: 1 })
      .limit(count - 50)
      .select('_id');
    await this.deleteMany({ _id: { $in: oldest.map(n => n._id) } });
  }
};

module.exports = mongoose.model('Notification', notificationSchema);
