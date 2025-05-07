import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.routes.js"; // Asegúrate de que esta ruta esté correctamente importada
import profileRoutes from './routes/profile.routes.js'; // Asegúrate de que esta ruta esté correctamente importada
import bookRoutes from './routes/bookRoutes.js';
import manualBookRoutes from './routes/manualBook.routes.js';

// Verificación temprana
console.log("✅ El archivo server.js se está ejecutando");
console.log("🔍 Leyendo variables de entorno...");
dotenv.config();
console.log("📋 Variables de entorno cargadas:", {
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI ? "***" : "NO DEFINIDA"
});

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba inmediata
app.get('/test', (req, res) => {
  console.log("🔔 Se accedió a /test");
  res.json({ message: "Test exitoso" });
});

// Registrar las rutas
app.use('/api/auth', authRoutes);  // Ruta para autenticación
app.use('/api/profiles', profileRoutes);  // Ruta para perfiles
app.use('/api/books', bookRoutes);
app.use('/api/manual-books', manualBookRoutes);


// Conexión a MongoDB con más logs
console.log("🔌 Intentando conectar a MongoDB...");
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("📦 Conexión a MongoDB exitosa");
    const server = app.listen(process.env.PORT, () => {
      console.log(`🚀 Servidor escuchando en puerto ${process.env.PORT}`);
      console.log(`🔗 Prueba: http://localhost:${process.env.PORT}/test`);
    });
    
    server.on('error', (err) => {
      console.error("❌ Error del servidor:", err);
    });
  })
  .catch(err => {
    console.error("❌ Fallo en conexión a MongoDB:", err.message);
    process.exit(1);
  });