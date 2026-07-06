import app from './app';
import dotenv from 'dotenv';
import { socketManager } from './sockets/socketManager';

dotenv.config();

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const server = app.listen(PORT as number, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});

socketManager(server);

// Setup graceful shutdown if needed
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
        process.exit(0);
    });
});
