const mongoose = require('mongoose');

/**
 * Season — belongs to an animation-type series (anime / donghua).
 * Manga/manhwa/manhua series do NOT use Season; they use Chapter directly.
 */
const seasonSchema = new mongoose.Schema(
  {
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manga',
      required: true,
    },
    number: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },
    description: {
      type: String,
      default: '',
      maxlength: 3000,
    },
    coverImage: {
      type: String,
      default: null,
    },
    year: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'hiatus', 'cancelled'],
      default: 'ongoing',
    },
    episodeCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// One series cannot have two seasons with the same number
seasonSchema.index({ series: 1, number: 1 }, { unique: true });
seasonSchema.index({ series: 1, status: 1 });

module.exports = mongoose.model('Season', seasonSchema);
