import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import bookRoutes from './routes/bookRoutes.js';
import manualBookRoutes from './routes/manualBook.routes.js';
import favoritesRouter from './routes/favorites.js';

// Verificación temprana
console.log('✅ El archivo server.js se está ejecutando');
console.log('🔍 Leyendo variables de entorno...');
dotenv.config();
console.log('📋 Variables de entorno cargadas:', {
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI ? '***' : 'NO DEFINIDA',
  FRONTEND_URL: process.env.FRONTEND_URL || 'NO DEFINIDA'
});

const app = express();

// Configuración de CORS segura
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  console.warn('⚠️  Variable FRONTEND_URL no definida. Revisa tu .env');
}
app.set('trust proxy', 1); // necesario si estás detrás de proxy (Render)
app.use(
  cors({
    origin: FRONTEND_URL,   // sólo permite solicitudes desde tu frontend
    credentials: true       // habilita envío de cookies si usas sesiones
  })
);

app.use(express.json());

// Ruta de prueba inmediata
app.get('/test', (req, res) => {
  console.log('🔔 Se accedió a /test');
  res.json({ message: 'Test exitoso' });
});

// Registrar las rutas
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/manual-books', manualBookRoutes);
app.use('/api/favorites', favoritesRouter);

// Conexión a MongoDB con más logs
console.log('🔌 Intentando conectar a MongoDB...');
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('📦 Conexión a MongoDB exitosa');
    const server = app.listen(process.env.PORT, () => {
      console.log(`🚀 Servidor escuchando en puerto ${process.env.PORT}`);
      console.log(`🔗 Prueba local: http://localhost:${process.env.PORT}/test`);
    });

    server.on('error', (err) => {
      console.error('❌ Error del servidor:', err);
    });
  })
  .catch((err) => {
    console.error('❌ Fallo en conexión a MongoDB:', err.message);
    process.exit(1);
  });