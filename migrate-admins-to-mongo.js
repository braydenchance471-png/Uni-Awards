#!/usr/bin/env node
/**
 * Migration script to move admins from admins.json to MongoDB
 * Run this once before deploying: node migrate-admins-to-mongo.js
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infinite-awards';
const ADMINS_FILE = path.join(__dirname, 'admins.json');

async function migrate() {
  try {
    
    if (!fs.existsSync(ADMINS_FILE)) {
      console.log('❌ admins.json not found');
      process.exit(1);
    }

    
    const fileContent = fs.readFileSync(ADMINS_FILE, 'utf8');
    const admins = JSON.parse(fileContent);
    console.log(`📄 Read ${Object.keys(admins).length} admins from admins.json`);

    
    const mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');

    const db = mongoClient.db();
    const adminsCollection = db.collection('admins');

    
    const deleteResult = await adminsCollection.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing admins from MongoDB`);

    
    const docs = Object.entries(admins).map(([username, admin]) => ({
      username,
      password: admin.password,
      name: admin.name
    }));

    if (docs.length > 0) {
      const insertResult = await adminsCollection.insertMany(docs);
      console.log(`✅ Inserted ${insertResult.insertedCount} admins into MongoDB`);
    }

    
    await mongoClient.close();
    console.log('✅ Migration complete!');
    
    
    const backupFile = `${ADMINS_FILE}.backup`;
    fs.copyFileSync(ADMINS_FILE, backupFile);
    console.log(`💾 Backed up admins.json to ${backupFile}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
