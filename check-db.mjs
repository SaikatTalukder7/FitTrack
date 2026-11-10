import 'dotenv/config';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  await client.db(process.env.MONGODB_DB || 'fittrack_app').command({ ping: 1 });
  console.log('DB OK');
} catch (e) {
  console.log('DB ERROR:', e.name, e.message);
} finally {
  await client.close();
}