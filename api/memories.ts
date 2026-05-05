import { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory store for demo (ephemeral in serverless)
let memories: any[] = [
  { id: '1', content: 'IRIS system initialized.', timestamp: new Date().toISOString() }
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(memories);
  }

  if (req.method === 'POST') {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const newMemory = {
      id: Date.now().toString(),
      content,
      timestamp: new Date().toISOString()
    };
    memories.push(newMemory);
    return res.status(201).json(newMemory);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    memories = memories.filter(m => m.id !== id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
