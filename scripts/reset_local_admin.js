require('module-alias/register');
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { User } = require('@models');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'admin@comic.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await User.updateOne(
      { email },
      { 
        $set: { 
          password: hashedPassword,
          role: 'admin',
          isEmailVerified: true 
        } 
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      console.log(`Created new admin: ${email}`);
    } else {
      console.log(`Updated existing admin: ${email}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
