import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from './routes/profile.routes.js';
import bookRoutes from './routes/bookRoutes.js';
import manualBookRoutes from './routes/manualBookRoutes.js';
import favoritesRouter from './routes/favorites.js';
import url from 'url';

dotenv.config();

console.log("✅ El archivo server.js se está ejecutando");
console.log("🔍 Leyendo variables de entorno...");
const { PORT, MONGO_URI } = process.env;
console.log("📋 Variables de entorno cargadas:", {
  PORT: PORT ?? "NO DEFINIDO",
  MONGO_URI: MONGO_URI ? (MONGO_URI.startsWith('mongodb+srv://') ? 'mongodb+srv://***' : 'mongodb://***') : "NO DEFINIDA"
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/test', (req, res) => {
  console.log("🔔 Se accedió a /test");
  res.json({ message: "Test exitoso" });
});

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/manual-books', manualBookRoutes);
app.use('/api/favorites', favoritesRouter);

if (!MONGO_URI) {
  console.error("❌ MONGO_URI no está definida en las variables de entorno. Revisa Render > Environment.");
  process.exit(1);
}

console.log("🔌 Intentando conectar a MongoDB...");

// Opciones recomendadas (Mongoose 8 ya maneja la mayoría por defecto)
const connectOpts = {
  // serverSelectionTimeoutMS: 10000, // opcional, acorta espera en selección de servidor
};

mongoose.connect(MONGO_URI, connectOpts)
  .then(() => {
    console.log("📦 Conexión a MongoDB exitosa");
    const server = app.listen(PORT || 5000, () => {
      console.log(`🚀 Servidor escuchando en puerto ${PORT || 5000}`);
      console.log(`🔗 Prueba: http://localhost:${PORT || 5000}/test`);
    });

    server.on('error', (err) => {
      console.error("❌ Error del servidor:", err);
    });
  })
  .catch(err => {
    console.error("❌ Fallo en conexión a MongoDB:", err.message);
    // Log adicional para diagnosticar ENOTFOUND / SRV
    if (err.code === 'ENOTFOUND' || /querySrv/i.test(err.message)) {
      try {
        const parsed = url.parse(MONGO_URI);
        // muestra host sin user/pass
        console.error("🔎 Error de resolución DNS para el host de Mongo. Host (sin credenciales):", parsed.host || parsed.hostname);
      } catch (e) {
        // ignore
      }
      console.error("💡 Sugerencias rápidas:");
      console.error("- Verifica que MONGO_URI en Render esté EXACTA la cadena de Atlas (sin comillas).");
      console.error("- Si usás mongodb+srv:// y la resolución SRV falla, cambia a la cadena 'Standard (mongodb://)' en Atlas y pega esa en MONGO_URI.");
      console.error("- Asegúrate de que la contraseña esté URL-encoded si tiene caracteres especiales.");
      console.error("- Temporalmente permite 0.0.0.0/0 en Atlas IP Access List para descartar problemas de whitelist.");
    } else {
      console.error("📜 Detalle del error completo:", err);
    }
    process.exit(1);
  });
