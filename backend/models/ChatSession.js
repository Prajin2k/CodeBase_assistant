import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const chatSessionSchema = new mongoose.Schema(
  {
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;
