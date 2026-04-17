const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcrypt');

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'admin@comic.com' }).select('+password');
    console.log('--- ADMIN CHECK ---');
    console.log('User Found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('Role:', user.role);
      console.log('Verified:', user.isEmailVerified);
      const match = await bcrypt.compare('admin123', user.password);
      console.log('Password Match (admin123):', match);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
