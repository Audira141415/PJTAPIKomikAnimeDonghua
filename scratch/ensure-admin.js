const mongoose = require('mongoose');
const User = require('./src/models/User');

async function fixAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Check by email
    let user = await User.findOne({ email: 'admin@comic.com' });
    
    // If not found by email, check by username
    if (!user) {
      user = await User.findOne({ username: 'admin' });
    }
    
    if (user) {
      console.log('Existing user found:', user.email, '/', user.username);
      user.email = 'admin@comic.com';
      user.username = 'admin';
      user.password = 'admin123'; // Will be hashed by pre-save link
      user.role = 'admin';
      user.isEmailVerified = true;
      await user.save();
      console.log('Admin account UPDATED and RESET to: admin@comic.com / admin123');
    } else {
      console.log('Creating NEW admin account...');
      await User.create({
        username: 'admin',
        email: 'admin@comic.com',
        password: 'admin123',
        role: 'admin',
        isEmailVerified: true
      });
      console.log('Admin account CREATED: admin@comic.com / admin123');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error during Admin Fix:', err);
    process.exit(1);
  }
}

fixAdmin();
