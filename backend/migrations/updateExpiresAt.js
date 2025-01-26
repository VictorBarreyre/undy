require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

const SecretSchema = new Schema({
  label: String,
  content: String,
  price: Number,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  expiresAt: Date
});

const Secret = mongoose.model('Secret', SecretSchema);

async function updateExpiresAt() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await Secret.updateMany(
      { expiresAt: { $exists: false } },
      { $set: { expiresAt: new Date(+new Date() + 7*24*60*60*1000) } }
    );
    console.log(`${result.modifiedCount} documents updated`);
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}

updateExpiresAt();