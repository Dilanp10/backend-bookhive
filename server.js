// server.js (debug CORS + request logger)
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

// ------------------------
// Variables de entorno
// ------------------------
const { PORT, MONGO_URI, FRONTEND_URL } = process.env;

console.log("✅ El archivo server.js se está ejecutando");
console.log("📋 Variables de entorno cargadas:", {
  PORT: PORT ?? "NO DEFINIDO",
  MONGO_URI: MONGO_URI ? (MONGO_URI.startsWith('mongodb+srv://') ? 'mongodb+srv://*' : 'mongodb://*') : "NO DEFINIDA",
  FRONTEND_URL: FRONTEND_URL ?? "NO DEFINIDA"
});

// ------------------------
// App Express
// ------------------------
const app = express();

// ------------------------
// Global request logger (muy útil para debugging)
// ------------------------
app.use((req, res, next) => {
  console.log('🔥 DEBUG REQUEST:');
  console.log('  Método:', req.method);
  console.log('  URL:', req.originalUrl);
  console.log('  Origin:', req.headers.origin);
  // imprimir headers con cuidado (puede ser verboso)
  console.log('  Headers:', {
    'content-type': req.headers['content-type'],
    'origin': req.headers.origin,
    'user-agent': req.headers['user-agent'],
    'accept': req.headers.accept,
    // si necesitás más, cámbialo por req.headers
  });
  next();
});

// ------------------------
// Construcción whitelist CORS
// ------------------------
const allowedOrigins = new Set();
if (FRONTEND_URL) allowedOrigins.add(FRONTEND_URL);
allowedOrigins.add('http://localhost:5173'); // Vite dev
allowedOrigins.add('http://localhost:3000'); // CRA dev
allowedOrigins.add('http://localhost:3001');

console.log("🔐 Orígenes permitidos CORS:", Array.from(allowedOrigins));

// ------------------------
// DEBUG CORS - temporal (FORZAR cabeceras y responder preflight)
// Este middleware se ejecuta antes de cualquier ruta y asegura que
// las solicitudes OPTIONS reciban cabeceras Access-Control-* apropiadas.
// Mantener solo temporalmente para diagnóstico; luego usar cors(corsOptions).
// ------------------------
app.use((req, res, next) => {
  // Logging básico para ver qué llega
  console.log(`[CORS DEBUG] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);

  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    // Responder el origen real (más seguro que '*')
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  // Si quieres permitir todo temporalmente (no recomendado):
  // res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    // Respondemos la preflight aquí y evitamos que llegue a otros handlers
    return res.status(204).end();
  }
  next();
});
// ------------------------
// FIN DEBUG CORS temporal
// ------------------------

// ------------------------
// CONFIGURACIÓN CORS (robusta, usada además del parche temporal)
// ------------------------
const corsOptions = {
  origin: function (origin, callback) {
    // permitir requests sin origin (herramientas tipo curl/postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    console.warn(`⚠️ Intento CORS desde origen no permitido: ${origin}`);
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Aplica CORS globalmente también (redundante con el parche, pero correcto)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // responde preflight para todas las rutas

// ------------------------
// Middlewares
// ------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------
// Rutas
// ------------------------
app.get('/test', (req, res) => {
  console.log("🔔 Se accedió a /test");
  res.json({ message: "Test exitoso" });
});

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/manual-books', manualBookRoutes);
app.use('/api/favorites', favoritesRouter);

// Ruta 404 para APIs no encontradas (útil para debugging)
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'Endpoint API no encontrado' });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.send('Backend BookHive funcionando');
});

// ------------------------
// Conexión a MongoDB
// ------------------------
if (!MONGO_URI) {
  console.error("❌ MONGO_URI no está definida en las variables de entorno. Revisa Render > Environment.");
  process.exit(1);
}

console.log("🔌 Intentando conectar a MongoDB...");

const connectOpts = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

mongoose.connect(MONGO_URI, connectOpts)
  .then(() => {
    console.log("📦 Conexión a MongoDB exitosa");

    const server = app.listen(PORT || 5000, () => {
      console.log(`🚀 Servidor escuchando en puerto ${PORT || 5000}`);
      console.log(`🔗 Prueba local: http://localhost:${PORT || 5000}/test`);
    });

    server.on('error', (err) => {
      console.error("❌ Error del servidor:", err);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log("🛑 Cerrando servidor...");
      await mongoose.disconnect();
      server.close(() => {
        console.log("✅ Servidor detenido");
        process.exit(0);
      });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  })
  .catch(err => {
    console.error("❌ Fallo en conexión a MongoDB:", err.message || err);
    if (err.code === 'ENOTFOUND' || /querySrv/i.test(err.message)) {
      try {
        const parsed = url.parse(MONGO_URI);
        console.error("🔎 Error de resolución DNS para el host de Mongo. Host (sin credenciales):", parsed.host || parsed.hostname);
      } catch (e) {
        // ignore
      }
      console.error("💡 Sugerencias rápidas:");
      console.error("- Verifica que MONGO_URI en Render esté EXACTA la cadena de Atlas (sin comillas).");
      console.error("- Si usás mongodb+srv:// y la resolución SRV falla, cambia a la cadena 'Standard (mongodb://)' en Atlas y pega esa en MONGO_URI.");
      console.error("- Asegúrate de que la contraseña esté URL-encoded si tiene caracteres especiales.");
      console.error("- Temporalmente permite 0.0.0.0/0 en Atlas IP Access List para descartar whitelist.");
    } else {
      console.error("📜 Detalle del error completo:", err);
    }
    process.exit(1);
  });
