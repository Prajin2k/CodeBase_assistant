import mongoose from 'mongoose';
const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  content: { type: String, default: '' },
  language: { type: String, default: 'text' },
});

const repositorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['upload', 'github'],
      default: 'upload',
    },
    githubUrl: {
      type: String,
      default: '',
    },
    files: [fileSchema],
  },
  {
    timestamps: true,
  }
);

const Repository = mongoose.model('Repository', repositorySchema);
export default Repository;
