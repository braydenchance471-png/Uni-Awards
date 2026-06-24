const express = require("express");
const fs = require("fs");
const session = require("express-session");
const path = require("path");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infinite-awards';
const ADMIN_ROUTE = process.env.ADMIN_ROUTE || 'admin-portal-42x9z7';

let mongoClient;
let adminsCollection;

app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: process.env.SESSION_SECRET || "some-random-secret-key",
  resave: false,
  saveUninitialized: false
}));

const SUB_FILE = "submissions.json";
const DATA_FILE = "data.json";

const activeAdmins = {};
const PRESENCE_TTL = 15000;

if (!fs.existsSync(SUB_FILE)) fs.writeFileSync(SUB_FILE, "[]");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}");

async function connectMongo() {
  try {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    adminsCollection = db.collection('admins');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function readAdmin(username) {
  const admin = await adminsCollection.findOne({ username });
  if (!admin) return null;
  return { password: admin.password, name: admin.name };
}

async function writeAdmin(username, admin) {
  await adminsCollection.updateOne(
    { username },
    { $set: { username, password: admin.password, name: admin.name } },
    { upsert: true }
  );
}

async function deleteAdmin(username) {
  await adminsCollection.deleteOne({ username });
}

async function readAdmins() {
  const admins = await adminsCollection.find({}).toArray();
  const result = {};
  for (const admin of admins) {
    result[admin.username] = { password: admin.password, name: admin.name };
  }
  return result;
}

async function writeAdmins(data) {
  
  await adminsCollection.deleteMany({});
  const docs = Object.entries(data).map(([username, admin]) => ({
    username,
    password: admin.password,
    name: admin.name
  }));
  if (docs.length > 0) {
    await adminsCollection.insertMany(docs);
  }
}

/* =========================
   ADMIN ACCOUNTS
========================= */
/* =========================
   ADMIN LOGIN (MULTI-USER)
========================= */

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const admin = await readAdmin(username);
  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: "Invalid login" });
  }

  req.session.admin = true;
  req.session.adminName = admin.name;

  res.json({
    success: true,
    name: admin.name
  });
});


/* =========================
   HELPERS
========================= */
function readSubs() {
  return JSON.parse(fs.readFileSync(SUB_FILE, "utf8"));
}

function writeSubs(data) {
  fs.writeFileSync(SUB_FILE, JSON.stringify(data, null, 2));
}

/* =========================
   AUTH
========================= */






app.post("/logout", (req, res) => {
  try {
    if (req.sessionID && activeAdmins[req.sessionID]) delete activeAdmins[req.sessionID];
  } catch (e) {}
  req.session.destroy(() => res.sendStatus(200));
});


app.post('/admin/heartbeat', (req, res) => {
  if (!req.session || !req.session.admin) return res.sendStatus(403);
  const sid = req.sessionID;
  const name = req.session.adminName || 'admin';
  const now = Date.now();

  
  activeAdmins[sid] = { username: name, lastSeen: now };

  
  for (const k of Object.keys(activeAdmins)) {
    if (now - activeAdmins[k].lastSeen > PRESENCE_TTL) delete activeAdmins[k];
  }

  
  let others = 0;
  for (const k of Object.keys(activeAdmins)) {
    if (k === sid) continue;
    if (now - activeAdmins[k].lastSeen <= PRESENCE_TTL) others++;
  }

  res.json({ others });
});

/* =========================
   ADMIN: RESET CREDENTIALS
   Body: { oldUsername, oldPassword, newUsername, newPassword, newName }
   Verifies old credentials and updates admins.json
========================= */
app.post('/admin/reset-credentials', async (req, res) => {
  const { oldUsername, oldPassword, newUsername, newPassword, newName } = req.body;
  if (!oldUsername || !oldPassword || !newUsername || !newPassword) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const existing = await readAdmin(oldUsername);
  if (!existing || existing.password !== oldPassword) {
    return res.status(401).json({ error: 'Invalid current credentials' });
  }

  
  await deleteAdmin(oldUsername);
  await writeAdmin(newUsername, { password: newPassword, name: newName || existing.name });

  
  if (req.session && req.session.admin) {
    if (req.session.adminName === existing.name) {
      req.session.adminName = (await readAdmin(newUsername)).name;
    }
  }

  res.json({ success: true });
});


app.get('/admin/list-admins', async (req, res) => {
  try {
    const admins = await readAdmins();
    return res.json(Object.keys(admins));
  } catch (e) {
    return res.status(500).json({ error: 'Unable to read admins' });
  }
});

/* =========================
   ADMIN PAGE
========================= */
app.get(ADMIN_ROUTE, (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

/* =========================
   ADMIN: GET SUBMISSIONS
========================= */
app.get("/admin/submissions", (req, res) => {
  if (!req.session.admin) return res.sendStatus(403);
  res.json(readSubs());
});

/* =========================
   ADMIN: UPDATE SUBMISSION
========================= */
app.post("/admin/submissions/update", (req, res) => {
  if (!req.session || !req.session.admin) {
    console.warn('Unauthorized attempt to update submission from', req.ip);
    return res.status(403).json({ error: 'not_authenticated' });
  }

  const { id, status, reason } = req.body || {};
  if (typeof id === 'undefined') return res.status(400).json({ error: 'missing_id' });

  const subs = readSubs();
  const sub = subs.find(s => s.id === id);
  if (!sub) {
    console.warn('Submission update: id not found', id);
    return res.status(404).json({ error: 'not_found' });
  }

  console.log(`Admin ${req.session.adminName || '?'} updating submission ${id} -> ${status}`);
  sub.status = status;
  sub.reason = reason || "";

  writeSubs(subs);
  res.json({ success: true });
});

/* =========================
   ADMIN: UPDATE COUNTDOWN
========================= */
app.post("/update", (req, res) => {
  if (!req.session || !req.session.admin) {
    console.warn('Unauthorized attempt to update countdown from', req.ip);
    return res.status(403).json({ error: 'not_authenticated' });
  }

  try {
    const body = req.body || {};
    console.log(`Admin ${req.session.adminName || '?'} updating countdown:`, body);
    fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2));
    return res.json({ success: true });
  } catch (e) {
    console.error('Failed to write data file', e);
    return res.status(500).json({ error: 'failed_to_write' });
  }
});


app.get('/admin/whoami', (req, res) => {
  if (req.session && req.session.admin) {
    return res.json({ admin: true, name: req.session.adminName || null });
  }
  return res.json({ admin: false });
});

app.get("/data", (req, res) => {
  res.json(JSON.parse(fs.readFileSync(DATA_FILE, "utf8")));
});

/* =========================
   PUBLIC: CREATE SUBMISSION
========================= */
app.post("/submit", (req, res) => {
  const {
    creator,
    name,
    username,
    teamName,
    teamSize,
    gameLink,
    link,
    robloxLink,
    game
  } = req.body;

  const finalCreator = creator || name || username || teamName;
  const finalGame = gameLink || link || robloxLink || game;

  if (!finalCreator || !finalGame) {
    return res.status(400).send("Invalid submission payload");
  }

  const subs = readSubs();

  subs.push({
    id: Date.now(),
    creator: finalCreator,
    teamSize: teamSize || "",
    gameLink: finalGame,
    status: "pending",
    reason: "",
    submittedAt: new Date().toISOString()
  });

  writeSubs(subs);
  res.sendStatus(200);
});

/* =========================
   PUBLIC: GET ALL SUBMISSIONS
========================= */
app.get("/submissions", (req, res) => {
  res.json(readSubs());
});

/* =========================
   PUBLIC: GET ONE SUBMISSION
========================= */
app.get("/submission/:id", (req, res) => {
  const subs = readSubs();
  const sub = subs.find(s => String(s.id) === req.params.id);
  if (!sub) return res.sendStatus(404);
  res.json(sub);
});

/* =========================
   FALLBACK
========================= */
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});


/* =========================
   START
========================= */
connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin URL: http://localhost:${PORT}/admin`);
  });
});
