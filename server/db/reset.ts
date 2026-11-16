import { getDatabase } from './database';
import { seedDatabase } from './seed';

const db = getDatabase();
seedDatabase(db, true);

const counts = {
  users: (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c,
  categories: (db.prepare('SELECT COUNT(*) AS c FROM categories').get() as { c: number }).c,
  listings: (db.prepare('SELECT COUNT(*) AS c FROM listings').get() as { c: number }).c,
  reviews: (db.prepare('SELECT COUNT(*) AS c FROM reviews').get() as { c: number }).c,
};

console.log('Rentora demo database reset complete:', counts);
