import { app } from './app';

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.listen(port, host, () => {
  console.log(`🚀 LookAround Backend server running on http://${host}:${port}`);
  console.log(`🌐 Configured FRONTEND_URL: ${frontendUrl}`);
});

