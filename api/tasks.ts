import { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory store for demo
let tasks: any[] = [];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(tasks);
  }

  if (req.method === 'POST') {
    const task = req.body;
    const newTask = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    return res.status(201).json(newTask);
  }

  if (req.method === 'PUT') {
    const { id } = req.query;
    const taskUpdate = req.body;
    tasks = tasks.map((t: any) => t.id === id ? { ...t, ...taskUpdate } : t);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    tasks = tasks.filter((t: any) => t.id !== id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
