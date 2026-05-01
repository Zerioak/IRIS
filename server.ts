import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const DATA_DIR = path.join(process.cwd(), "data");
const MEMORIES_FILE = path.join(DATA_DIR, "memories.json");
const TASKS_FILE = path.join(DATA_DIR, "tasks.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try { await fs.access(MEMORIES_FILE); } catch { await fs.writeFile(MEMORIES_FILE, JSON.stringify([])); }
    try { await fs.access(TASKS_FILE); } catch { await fs.writeFile(TASKS_FILE, JSON.stringify([])); }
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

async function startServer() {
  await ensureDataDir();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Memories API
  app.get("/api/memories", async (req, res) => {
    try {
      const data = await fs.readFile(MEMORIES_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ error: "Failed to load memories" });
    }
  });

  app.post("/api/memories", async (req, res) => {
    try {
      const { content } = req.body;
      const data = JSON.parse(await fs.readFile(MEMORIES_FILE, "utf-8"));
      const newMemory = {
        id: Date.now().toString(),
        content,
        timestamp: new Date().toISOString()
      };
      data.push(newMemory);
      await fs.writeFile(MEMORIES_FILE, JSON.stringify(data.slice(-50), null, 2)); // Keep last 50
      res.json(newMemory);
    } catch (err) {
      res.status(500).json({ error: "Failed to save memory" });
    }
  });

  app.delete("/api/memories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let data = JSON.parse(await fs.readFile(MEMORIES_FILE, "utf-8"));
      data = data.filter((m: any) => m.id !== id);
      await fs.writeFile(MEMORIES_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  // Tasks API
  app.get("/api/tasks", async (req, res) => {
    try {
      const data = await fs.readFile(TASKS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ error: "Failed to load tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const task = req.body;
      const data = JSON.parse(await fs.readFile(TASKS_FILE, "utf-8"));
      const newTask = {
        ...task,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      data.push(newTask);
      await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2));
      res.json(newTask);
    } catch (err) {
      res.status(500).json({ error: "Failed to save task" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const taskUpdate = req.body;
      let data = JSON.parse(await fs.readFile(TASKS_FILE, "utf-8"));
      data = data.map((t: any) => t.id === id ? { ...t, ...taskUpdate } : t);
      await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let data = JSON.parse(await fs.readFile(TASKS_FILE, "utf-8"));
      data = data.filter((t: any) => t.id !== id);
      await fs.writeFile(TASKS_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Stark Mail Endpoint
  app.post("/api/send-email", async (req, res) => {
    const { title, description, dueDate } = req.body;
    const targetEmail = process.env.TARGET_EMAIL || "usep26709@gmail.com";

    // Setup transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Defaulting to Gmail, user can change in env
      auth: {
        user: process.env.STARK_MAIL_USER,
        pass: process.env.STARK_MAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"IRIS - Stark Systems" <${process.env.STARK_MAIL_USER}>`,
      to: targetEmail,
      subject: `[REMINDER] Task Activation: ${title}`,
      text: `Sir,\n\nThis is an automated reminder from IRIS.\n\nTask: ${title}\nDescription: ${description}\nDue Date: ${dueDate}\n\nSystems are standby.\n- IRIS`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #000; color: #fff; padding: 20px; border-radius: 15px; border: 1px solid #1e3a8a;">
          <h2 style="color: #3b82f6;">[STARK SYSTEMS] REMINDER ACTIVATED</h2>
          <p>Sir, this is an automated reminder from <b>IRIS</b>.</p>
          <hr style="border: 0.5px solid #1e3a8a;" />
          <p><b>Task:</b> ${title}</p>
          <p><b>Description:</b> ${description}</p>
          <p><b>Due Date:</b> ${dueDate}</p>
          <br />
          <p style="color: #666; font-size: 12px;">The system is fully operational. Awaiting further commands.</p>
        </div>
      `,
    };

    try {
      if (!process.env.STARK_MAIL_USER || !process.env.STARK_MAIL_PASS) {
        console.error("SIR, THE STARK MAIL PROTOCOL IS MISSING CREDENTIALS. CHECK SMTP SETTINGS.");
        return res.status(500).json({ 
          success: false, 
          error: "IRIS MAIL SYSTEM OFFLINE: Missing SMTP credentials. Sir, please ensure STARK_MAIL_USER and STARK_MAIL_PASS (preferably a Gmail App Password) are configured in the environment." 
        });
      }
      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("Email Error:", error);
      let friendlyError = error.message;
      if (error.message.includes("535-5.7.8")) {
        friendlyError = "AUTHENTICATION FAILURE: Gmail rejected the login. Sir, you likely need a 'Gmail App Password' instead of your standard password.";
      }
      res.status(500).json({ success: false, error: friendlyError });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IRIS Server running on http://localhost:${PORT}`);
  });
}

startServer();
