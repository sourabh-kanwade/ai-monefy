import { app } from './app.js';
import { initDb } from './db/db.js';

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    await initDb();
    console.log('PostgreSQL database initialized successfully');

    app.listen(PORT, () => {
      console.log(`AI Monefy backend server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
