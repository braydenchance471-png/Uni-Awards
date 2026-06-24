const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-session-secret';

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'siteData.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');

const defaultData = {
  countdownDate: '2026-12-31T20:00:00',
  leaderboardHidden: false,
  leaderboardHiddenMessage: 'The leaderboard is currently hidden. Check back soon for the official rankings.',
  guidelines: [
    { title: 'Original Work', text: 'All submitted games must be created during the jam period and must follow the official Unify Awards rules.' },
    { title: 'Team Size', text: 'Teams may work solo or in groups. Every team member must be credited properly.' },
    { title: 'Submission Deadline', text: 'Projects must be submitted before the countdown reaches zero. Late submissions may not be counted.' },
    { title: 'Respect', text: 'All participants must be respectful. Harassment, stealing work, or breaking rules can lead to disqualification.' }
  ],
  information: {
    title: 'About UnifyAwards 2026',
    text: 'Unify Awards is a polished game jam and awards event where developers create, submit, and showcase their games. Compete for placements, prizes, recognition, and a spot on the official leaderboard.'
  },
  podium: [
    { placement: '2nd Place', gameName: 'Runner Up Game', image: '', prize: '£50 Prize' },
    { placement: '1st Place', gameName: 'Champion Game', image: '', prize: '£100 Prize' },
    { placement: '3rd Place', gameName: 'Third Place Game', image: '', prize: '£25 Prize' }
  ],
  leaderboard: [
    { rank: 1, team: 'BlueByte Studios', project: 'Skyline Rush', score: 98, status: 'Winner', prize: '£100' },
    { rank: 2, team: 'PixelForge', project: 'Neon Drift', score: 93, status: 'Finalist', prize: '£50' },
    { rank: 3, team: 'Nova Devs', project: 'Echo World', score: 89, status: 'Finalist', prize: '£25' },
    { rank: 4, team: 'SoloCraft', project: 'Tiny Quest', score: 84, status: 'Reviewed', prize: '-' }
  ]
};

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
  }
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

ensureDataFile();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }
}));
app.use(express.static(PUBLIC_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed.'));
    cb(null, true);
  }
});

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) return res.status(401).json({ success: false, message: 'Not logged in.' });
  next();
}

app.get('/api/data', (req, res) => res.json(readData()));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: 'Invalid username or password.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/admin/check', (req, res) => res.json({ loggedIn: !!req.session.isAdmin }));

app.post('/api/admin/save', requireAdmin, (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') return res.status(400).json({ success: false, message: 'Invalid data.' });

  const clean = {
    countdownDate: incoming.countdownDate || defaultData.countdownDate,
    leaderboardHidden: Boolean(incoming.leaderboardHidden),
    leaderboardHiddenMessage: typeof incoming.leaderboardHiddenMessage === 'string' && incoming.leaderboardHiddenMessage.trim() ? incoming.leaderboardHiddenMessage.trim() : defaultData.leaderboardHiddenMessage,
    guidelines: Array.isArray(incoming.guidelines) ? incoming.guidelines : defaultData.guidelines,
    information: incoming.information && typeof incoming.information === 'object' ? incoming.information : defaultData.information,
    podium: Array.isArray(incoming.podium) ? incoming.podium.slice(0, 3) : defaultData.podium,
    leaderboard: Array.isArray(incoming.leaderboard) ? incoming.leaderboard : defaultData.leaderboard
  };

  writeData(clean);
  res.json({ success: true, data: clean });
});

app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
app.get('/leaderboard', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'leaderboard.html')));
app.get('/guidelines', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'guidelines.html')));
app.get('/information', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'information.html')));
app.get('/', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => console.log(`UnifyAwards 2026 running on http://localhost:${PORT}`));
