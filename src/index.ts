import { app } from './app';

const port = process.env.PORT || 3000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.listen(port, () => {
  console.log(`🚀 LookAround Backend server running on port ${port}`);
  console.log(`🌐 Allowed CORS origin: ${frontendUrl}`);
});
