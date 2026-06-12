/**
 * Create IPFS-related indexes on the Content collection.
 * Run once during DB initialisation or as a migration.
 */

const mongoose = require('mongoose');

async function createIpfsIndexes() {
  const db = mongoose.connection.db;
  const collection = db.collection('contents');

  await collection.createIndex({ cid: 1 }, { sparse: true, background: true });
  await collection.createIndex({ metadataCid: 1 }, { sparse: true, background: true });
  await collection.createIndex({ gatewayUrl: 1 }, { sparse: true, background: true });
  await collection.createIndex({ 'pinningInfo.primaryHash': 1 }, { sparse: true, background: true });

  console.log('[createIpfsIndexes] IPFS indexes created successfully');
}

module.exports = { createIpfsIndexes };
