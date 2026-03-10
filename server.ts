import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database.Database;
try {
  db = new Database("mods.db");
  console.log("Database connected.");
} catch (e) {
  console.error("Failed to connect to database:", e);
  process.exit(1);
}

// Initialize database
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      username TEXT,
      password TEXT,
      role TEXT DEFAULT 'user', -- 'owner', 'operator', 'mod', 'user'
      status TEXT DEFAULT 'active',
      device_id TEXT,
      ban_reason TEXT,
      bio TEXT,
      pfp TEXT,
      warnings INTEGER DEFAULT 0,
      banned_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      files TEXT NOT NULL,
      author TEXT,
      author_name TEXT,
      likes INTEGER DEFAULT 0,
      is_safe INTEGER DEFAULT 1,
      is_banned INTEGER DEFAULT 0,
      ban_prompt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT,
      receiver TEXT,
      content TEXT,
      image TEXT,
      is_bot INTEGER DEFAULT 0,
      bot_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS friends (
      user1 TEXT,
      user2 TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
      PRIMARY KEY (user1, user2)
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower TEXT,
      following TEXT,
      PRIMARY KEY (follower, following)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter TEXT,
      reported TEXT,
      reason TEXT,
      explanation TEXT,
      proof TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'resolved'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      prompt TEXT,
      response TEXT,
      thinking TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(email) REFERENCES users(email)
    );

    CREATE TABLE IF NOT EXISTS violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      prompt TEXT,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mod_likes (
      mod_id INTEGER,
      email TEXT,
      PRIMARY KEY (mod_id, email)
    );
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mod_id INTEGER,
      rating INTEGER,
      comment TEXT,
      user TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(mod_id) REFERENCES mods(id)
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      prompt TEXT,
      response TEXT,
      thinking TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(email) REFERENCES users(email)
    );

    CREATE TABLE IF NOT EXISTS violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      prompt TEXT,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mod_likes (
      mod_id INTEGER,
      email TEXT,
      PRIMARY KEY (mod_id, email)
    );
  `);
  console.log("Tables initialized.");
  
  // Migrations
  try {
    db.exec("ALTER TABLE mods ADD COLUMN is_banned INTEGER DEFAULT 0");
    console.log("Migration: Added is_banned to mods table.");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN username TEXT");
    db.exec("ALTER TABLE users ADD COLUMN device_id TEXT");
    db.exec("ALTER TABLE users ADD COLUMN ban_reason TEXT");
    db.exec("ALTER TABLE users ADD COLUMN banned_until DATETIME");
    console.log("Migration: Added username, device_id, ban_reason, banned_until to users table.");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN bio TEXT");
    db.exec("ALTER TABLE users ADD COLUMN pfp TEXT");
    console.log("Migration: Added bio and pfp to users table.");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN warnings INTEGER DEFAULT 0");
    db.exec("ALTER TABLE mods ADD COLUMN author_name TEXT");
    db.exec("ALTER TABLE mods ADD COLUMN ban_prompt TEXT");
    console.log("Migration: Added warnings, author_name, and ban_prompt.");
  } catch (e) {}
} catch (e) {
  console.error("Failed to initialize tables:", e);
}

// Seed owners
try {
  db.prepare("INSERT OR IGNORE INTO users (email, username, role) VALUES (?, ?, ?)").run("guillermojohn1105@gmail.com", "Owner", "owner");
  db.prepare("INSERT OR IGNORE INTO users (email, username, role) VALUES (?, ?, ?)").run("sigmanrizzler2@gmail.com", "Owner 2", "owner");
  console.log("Owners seeded.");
} catch (e) {
  console.error("Failed to seed owners:", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV || 'development' });
  });

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { email, username, password, device_id } = req.body;
    try {
      // Check if device is banned
      const bannedDevice = db.prepare("SELECT * FROM users WHERE device_id = ? AND status = 'banned'").get(device_id);
      const status = bannedDevice ? 'banned' : 'active';
      const reason = bannedDevice ? 'Phone ban: Linked to banned account' : null;

      db.prepare("INSERT INTO users (email, username, password, device_id, status, ban_reason) VALUES (?, ?, ?, ?, ?, ?)").run(email, username, password, device_id, status, reason);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password, device_id } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      // Update device_id on login
      db.prepare("UPDATE users SET device_id = ? WHERE email = ?").run(device_id, user.email);
      
      // Check if device is banned
      const bannedDevice = db.prepare("SELECT * FROM users WHERE device_id = ? AND status = 'banned' AND email != ?").get(device_id, user.email);
      if (bannedDevice && user.status !== 'banned') {
        db.prepare("UPDATE users SET status = 'banned', ban_reason = 'Phone ban: Linked to banned account' WHERE email = ?").run(user.email);
        user.status = 'banned';
      }

      res.json({ email: user.email, username: user.username, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // User Status Middleware
  const checkUserStatus = (req: any, res: any, next: any) => {
    const email = req.headers['x-user-email'] || 'anonymous';
    const device_id = req.headers['x-device-id'];
    
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    // Check device ban
    if (device_id) {
      const bannedDevice = db.prepare("SELECT * FROM users WHERE device_id = ? AND status = 'banned'").get(device_id);
      if (bannedDevice && (!user || user.status !== 'banned')) {
        if (user) db.prepare("UPDATE users SET status = 'banned', ban_reason = 'Phone ban: Linked to banned account' WHERE email = ?").run(user.email);
        return res.status(403).json({ error: "Banned", reason: "Phone ban: Linked to banned account" });
      }
    }

    if (user && user.status === 'banned') {
      return res.status(403).json({ error: "Banned", reason: user.ban_reason });
    }
    next();
  };

  // API Routes
  app.get("/api/user/status", (req, res) => {
    const email = req.headers['x-user-email'] || 'anonymous';
    const user = db.prepare("SELECT email, username, role, status, ban_reason, bio, pfp FROM users WHERE email = ?").get(email);
    res.json(user || { email, status: 'active', role: 'user' });
  });

  app.post("/api/user/profile", checkUserStatus, (req, res) => {
    const email = req.headers['x-user-email'];
    const { username, bio, pfp } = req.body;
    db.prepare("UPDATE users SET username = ?, bio = ?, pfp = ? WHERE email = ?").run(username, bio, pfp, email);
    res.json({ success: true });
  });

  app.get("/api/chat/history", (req, res) => {
    const email = req.headers['x-user-email'];
    const history = db.prepare("SELECT * FROM chat_history WHERE email = ? ORDER BY created_at DESC").all(email);
    res.json(history);
  });

  app.post("/api/chat/history", (req, res) => {
    const { email, prompt, response, thinking } = req.body;
    db.prepare("INSERT INTO chat_history (email, prompt, response, thinking) VALUES (?, ?, ?, ?)").run(email, prompt, response, thinking);
    res.json({ success: true });
  });

  app.post("/api/violations", (req, res) => {
    const { email, prompt, reason } = req.body;
    db.prepare("INSERT INTO violations (email, prompt, reason) VALUES (?, ?, ?)").run(email, prompt, reason);
    db.prepare("UPDATE users SET status = 'banned', ban_reason = ? WHERE email = ?").run(reason, email);
    res.json({ success: true });
  });

  app.get("/api/mods", (req, res) => {
    const mods = db.prepare("SELECT * FROM mods WHERE is_safe = 1 AND is_banned = 0 ORDER BY created_at DESC").all();
    res.json(mods);
  });

  app.get("/api/mods/banned", (req, res) => {
    const mods = db.prepare("SELECT * FROM mods WHERE is_banned = 1 ORDER BY created_at DESC").all();
    res.json(mods);
  });

  app.get("/api/admin/banned-mods", (req, res) => {
    const mods = db.prepare("SELECT * FROM mods WHERE is_banned = 1 ORDER BY created_at DESC").all();
    res.json(mods);
  });

  app.post("/api/mods", checkUserStatus, (req, res) => {
    const { name, description, category, files, author, author_name, is_safe, ban_prompt } = req.body;
    const info = db.prepare("INSERT INTO mods (name, description, category, files, author, author_name, is_safe, is_banned, ban_prompt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(name, description, category, JSON.stringify(files), author, author_name, is_safe ? 1 : 0, is_safe ? 0 : 1, ban_prompt);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/mods/:id/like", checkUserStatus, (req, res) => {
    const { id } = req.params;
    const email = req.headers['x-user-email'] || 'anonymous';
    try {
      db.prepare("INSERT INTO mod_likes (mod_id, email) VALUES (?, ?)").run(id, email);
      db.prepare("UPDATE mods SET likes = likes + 1 WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Already liked" });
    }
  });

  app.get("/api/mods/:id/ratings", (req, res) => {
    const ratings = db.prepare("SELECT * FROM ratings WHERE mod_id = ?").all(req.params.id);
    res.json(ratings);
  });

  app.post("/api/mods/:id/ratings", checkUserStatus, (req, res) => {
    const { rating, comment, user } = req.body;
    db.prepare("INSERT INTO ratings (mod_id, rating, comment, user) VALUES (?, ?, ?, ?)")
      .run(req.params.id, rating, comment, user);
    res.json({ success: true });
  });

  // Social & Messaging Routes
  app.get("/api/messages", checkUserStatus, (req, res) => {
    const email = req.headers['x-user-email'];
    const other = req.query.with;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender = ? AND receiver = ?) 
      OR (sender = ? AND receiver = ?) 
      ORDER BY created_at ASC
    `).all(email, other, other, email);
    res.json(messages);
  });

  app.post("/api/messages", checkUserStatus, (req, res) => {
    const { receiver, content, image } = req.body;
    const sender = req.headers['x-user-email'];
    db.prepare("INSERT INTO messages (sender, receiver, content, image) VALUES (?, ?, ?, ?)").run(sender, receiver, content, image);
    res.json({ success: true });
  });

  app.get("/api/social/status", checkUserStatus, (req, res) => {
    const email = req.headers['x-user-email'];
    const target = req.query.target;
    const isFriend = db.prepare("SELECT * FROM friends WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)").get(email, target, target, email);
    const isFollowing = db.prepare("SELECT * FROM follows WHERE follower = ? AND following = ?").get(email, target);
    res.json({ isFriend: !!isFriend, isFollowing: !!isFollowing });
  });

  app.get("/api/users/search", checkUserStatus, (req, res) => {
    const q = req.query.q as string;
    const users = db.prepare("SELECT email, username, role, pfp FROM users WHERE username LIKE ? OR email LIKE ? LIMIT 10")
      .all(`%${q}%`, `%${q}%`);
    res.json(users);
  });

  app.post("/api/violations", checkUserStatus, (req, res) => {
    const { email, prompt, reason } = req.body;
    db.prepare("INSERT INTO violations (email, prompt, reason) VALUES (?, ?, ?)").run(email, prompt, reason);
    
    // Robbie sends a warning message
    db.prepare("INSERT INTO messages (sender, receiver, content, is_bot, bot_name) VALUES (?, ?, ?, ?, ?)")
      .run("system", email, `WARNING: Your mod attempt "${prompt.substring(0, 30)}..." was blocked for: ${reason}. Repeated violations will result in a permanent ban.`, 1, "Robbie The Robot Guard");
    
    // Increment warnings
    db.prepare("UPDATE users SET warnings = warnings + 1 WHERE email = ?").run(email);
    
    // Auto-ban if warnings >= 2
    const user = db.prepare("SELECT warnings FROM users WHERE email = ?").get(email) as any;
    if (user && user.warnings >= 2) {
      db.prepare("UPDATE users SET status = 'banned', ban_reason = 'Multiple safety violations' WHERE email = ?").run(email);
    }
    
    res.json({ success: true });
  });

  app.post("/api/social/friend", checkUserStatus, (req, res) => {
    const { target, action } = req.body;
    const email = req.headers['x-user-email'] as string;
    if (action === 'add') {
      db.prepare("INSERT OR IGNORE INTO friends (user1, user2, status) VALUES (?, ?, 'accepted')").run(email, target);
    } else {
      db.prepare("DELETE FROM friends WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)").run(email, target, target, email);
    }
    res.json({ success: true });
  });

  app.post("/api/social/follow", checkUserStatus, (req, res) => {
    const { target, action } = req.body;
    const email = req.headers['x-user-email'] as string;
    if (action === 'follow') {
      db.prepare("INSERT OR IGNORE INTO follows (follower, following) VALUES (?, ?)").run(email, target);
    } else {
      db.prepare("DELETE FROM follows WHERE follower = ? AND following = ?").run(email, target);
    }
    res.json({ success: true });
  });

  app.post("/api/reports", checkUserStatus, (req, res) => {
    const { reported, reason, explanation, proof } = req.body;
    const reporter = req.headers['x-user-email'];
    db.prepare("INSERT INTO reports (reporter, reported, reason, explanation, proof) VALUES (?, ?, ?, ?, ?)").run(reporter, reported, reason, explanation, proof);
    res.json({ success: true });
  });

  app.post("/api/mods/:id", checkUserStatus, (req, res) => {
    const { id } = req.params;
    const { name, description, files } = req.body;
    const email = req.headers['x-user-email'];
    
    const mod = db.prepare("SELECT author FROM mods WHERE id = ?").get(id) as any;
    const user = db.prepare("SELECT role FROM users WHERE email = ?").get(email) as any;
    
    if (mod.author === email || user.role === 'owner' || email === 'guillermojohn1105@gmail.com') {
      db.prepare("UPDATE mods SET name = ?, description = ?, files = ? WHERE id = ?")
        .run(name, description, JSON.stringify(files), id);
      res.json({ success: true });
    } else {
      res.status(403).json({ error: "Unauthorized" });
    }
  });

  app.post("/api/admin/report/resolve", (req, res) => {
    const { reportId, action, reason } = req.body;
    const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(reportId) as any;
    if (!report) return res.status(404).send("Report not found");

    if (action === 'warning') {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(report.reported) as any;
      const newWarnings = (user.warnings || 0) + 1;
      
      if (newWarnings >= 2) {
        db.prepare("UPDATE users SET status = 'banned', ban_reason = ?, warnings = ? WHERE email = ?").run(`Permanently banned after multiple warnings: ${reason}`, newWarnings, report.reported);
      } else {
        db.prepare("UPDATE users SET warnings = ? WHERE email = ?").run(newWarnings, report.reported);
        // Send bot message
        db.prepare("INSERT INTO messages (sender, receiver, content, is_bot, bot_name) VALUES (?, ?, ?, 1, 'Robbie The Robot Guard')")
          .run('system', report.reported, `WARNING: You have been reported for ${report.reason}. This is your last warning. If you violate the rules again, you will be permanently banned.`);
      }
    }
    db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(reportId);
    res.json({ success: true });
  });
  app.get("/api/admin/violations", (req, res) => {
    const email = req.headers['x-user-email'];
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!['owner', 'operator', 'mod'].includes(user?.role)) return res.status(403).send("Unauthorized");
    const violations = db.prepare("SELECT * FROM violations ORDER BY created_at DESC").all();
    res.json(violations);
  });

  app.get("/api/admin/users", (req, res) => {
    const email = req.headers['x-user-email'];
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!['owner', 'operator', 'mod'].includes(user?.role)) return res.status(403).send("Unauthorized");
    const users = db.prepare("SELECT email, username, role, status FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/mod/action", (req, res) => {
    const adminEmail = req.headers['x-user-email'];
    const admin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail) as any;
    if (!['owner', 'operator', 'mod'].includes(admin?.role)) return res.status(403).send("Unauthorized");
    
    const { email: id, action } = req.body; // 'email' field is used for ID in the generic handleAdminAction
    if (action === 'ban') {
      db.prepare("UPDATE mods SET is_banned = 1 WHERE id = ?").run(id);
    } else if (action === 'unban') {
      db.prepare("UPDATE mods SET is_banned = 0 WHERE id = ?").run(id);
    }
    res.json({ success: true });
  });

  app.post("/api/admin/user/action", (req, res) => {
    const adminEmail = req.headers['x-user-email'];
    const admin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail) as any;
    if (!['owner', 'operator'].includes(admin?.role)) return res.status(403).send("Unauthorized");
    
    const { email, action, reason, role } = req.body;
    const target = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    
    if (!target) return res.status(404).send("User not found");

    // Hierarchy check
    if (admin.role === 'operator' && target.role === 'owner') {
      return res.status(403).send("Operators cannot modify Owner");
    }
    if (admin.role === 'operator' && target.role === 'operator' && admin.email !== target.email) {
      return res.status(403).send("Operators cannot modify other Operators");
    }

    if (action === 'unban') {
      db.prepare("UPDATE users SET status = 'active', ban_reason = NULL WHERE email = ?").run(email);
    } else if (action === 'ban') {
      db.prepare("UPDATE users SET status = 'banned', ban_reason = ? WHERE email = ?").run(reason, email);
    } else if (action === 'set_role') {
      // Only owner can set operator role
      if (admin.role === 'operator' && role === 'operator') {
        return res.status(403).send("Only Owner can promote to Operator");
      }
      db.prepare("UPDATE users SET role = ? WHERE email = ?").run(role, email);
    }
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("Initializing Vite dev server...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware integrated.");
    } catch (e) {
      console.error("Failed to initialize Vite server:", e);
    }
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
