import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock Zoom Meeting Link - simula la respuesta de la Cloud Function
app.post('/getZoomMeetingLink', async (req, res) => {
  try {
    const { meetingKey } = req.body;

    // URLs reales de Zoom con los Meeting IDs proporcionados
    const joinUrls = {
      codigo: 'https://zoom.us/wc/join/8460034072',
      maquina: 'https://zoom.us/wc/join/8621739957',
      maestria: 'https://zoom.us/wc/join/8795803494',
    };

    const joinUrl = joinUrls[meetingKey];
    if (!joinUrl) {
      return res.status(400).json({ error: 'Meeting key inválido' });
    }

    console.log(`✓ Mock: Generando URL para sala "${meetingKey}"`);
    console.log(`  → URL: ${joinUrl}`);
    res.json({ joinUrl });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock Zoom Service running' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Mock Zoom Service escuchando en http://localhost:${PORT}`);
  console.log(`\nEndpoints disponibles:`);
  console.log(`  POST http://localhost:${PORT}/getZoomMeetingLink`);
  console.log(`  GET http://localhost:${PORT}/health\n`);
});
