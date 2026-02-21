// MongoDB Replica Set Initialization Script
// This script initializes the MongoDB replica set configuration

print("Initializing MongoDB Replica Set...");

// Wait for all nodes to be available
function waitForNode(host, name) {
  var maxAttempts = 30;
  var attempt = 0;

  while (attempt < maxAttempts) {
    try {
      var conn = new Mongo(host);
      conn.adminCommand('ping');
      print(name + " is ready");
      return true;
    } catch (e) {
      print("Waiting for " + name + " (attempt " + (attempt + 1) + "/" + maxAttempts + ")...");
      sleep(2000);
      attempt++;
    }
  }
  throw new Error("Timeout waiting for " + name);
}

// Wait for all nodes
waitForNode("mongodb-primary:27017", "mongodb-primary");
waitForNode("mongodb-secondary1:27017", "mongodb-secondary1");
waitForNode("mongodb-secondary2:27017", "mongodb-secondary2");
waitForNode("mongodb-arbiter:27017", "mongodb-arbiter");

print("All nodes are ready. Initiating replica set...");

// Connect to primary
var conn = new Mongo("mongodb-primary:27017");
var config = {
  _id: "rs0",
  version: 1,
  members: [
    {
      _id: 0,
      host: "mongodb-primary:27017",
      priority: 3,
      tags: { "nodeType": "primary", "region": "us-east" }
    },
    {
      _id: 1,
      host: "mongodb-secondary1:27017",
      priority: 2,
      tags: { "nodeType": "secondary", "region": "us-west" }
    },
    {
      _id: 2,
      host: "mongodb-secondary2:27017",
      priority: 2,
      tags: { "nodeType": "secondary", "region": "eu-central" }
    },
    {
      _id: 3,
      host: "mongodb-arbiter:27017",
      priority: 1,
      arbiterOnly: true,
      tags: { "nodeType": "arbiter", "region": "us-east" }
    }
  ],
  settings: {
    electionTimeoutMillis: 5000,
    heartbeatTimeoutSecs: 10,
    heartbeatIntervalMillis: 2000,
    catchUpTimeoutMillis: 60000,
    getLastErrorDefaults: {
      w: "majority",
      wtimeout: 5000
    }
  }
};

// Initialize replica set
var result = rs.initiate(config);
printjson(result);

if (result.ok !== 1) {
  throw new Error("Failed to initiate replica set: " + JSON.stringify(result));
}

// Wait for replica set to be ready
print("Waiting for replica set to stabilize...");
sleep(10000);

// Verify configuration
var status = rs.status();
print("Replica set status:");
printjson(status);

// Create application database and user
print("Creating application database and user...");
var db = conn.getDB("web3content");

// Create collections with indexes
db.createCollection("users");
db.createCollection("content");
db.createCollection("subscriptions");
db.createCollection("transactions");
db.createCollection("analytics");

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "walletAddress": 1 }, { unique: true });
db.content.createIndex({ "creatorId": 1 });
db.content.createIndex({ "createdAt": -1 });
db.subscriptions.createIndex({ "userId": 1, "status": 1 });
db.transactions.createIndex({ "userId": 1, "timestamp": -1 });

// Create application user
db.getSiblingDB("admin").createUser({
  user: "web3app",
  pwd: "web3app_password_123",
  roles: [
    { role: "readWrite", db: "web3content" },
    { role: "dbAdmin", db: "web3content" },
    { role: "read", db: "admin" },
    { role: "clusterMonitor", db: "admin" }
  ]
});

print("MongoDB replica set initialization completed successfully!");
print("Primary: mongodb-primary:27017");
print("Secondaries: mongodb-secondary1:27017, mongodb-secondary2:27017");
print("Arbiter: mongodb-arbiter:27017");
print("Config Server: mongodb-config:27017");