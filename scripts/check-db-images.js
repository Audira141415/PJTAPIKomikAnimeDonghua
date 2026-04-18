'use strict';
require('module-alias/register');
require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const { Manga } = require('@models');
  
  // Cek record yang sudah ter-mirror (ada /uploads di coverImage)
  const mirrored = await Manga.findOne({ coverImage: /^\/uploads/ }, 'title coverImage type');
  // Cek record yang masih pakai URL luar
  const external = await Manga.findOne({ coverImage: /^http/ }, 'title coverImage type');
  // Total keduanya
  const totalMirrored = await Manga.countDocuments({ coverImage: /^\/uploads/ });
  const totalExternal = await Manga.countDocuments({ coverImage: /^http/ });

  console.log('=== DATABASE IMAGE STATUS ===');
  console.log('Total Mirrored (local):', totalMirrored);
  console.log('Total External (remote):', totalExternal);
  console.log('---');
  if (mirrored) {
    console.log('Sample Mirrored:', mirrored.title, '->', mirrored.coverImage);
  } else {
    console.log('NO mirrored records found in DB yet!');
  }
  if (external) {
    console.log('Sample External:', external.title, '->', external.coverImage.substring(0, 80));
  }
  
  await mongoose.disconnect();
}

check().catch(console.error);
