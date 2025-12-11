import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; // Ya importado
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
const { PORT, MONGO_URI, FRONTEND_URL } = process.env; // Añadí FRONTEND_URL
console.log("📋 Variables de entorno cargadas:", {
  PORT: PORT ?? "NO DEFINIDO",
  MONGO_URI: MONGO_URI ? (MONGO_URI.startsWith('mongodb+srv://') ? 'mongodb+srv://*' : 'mongodb://*') : "NO DEFINIDA",
  FRONTEND_URL: FRONTEND_URL ?? "NO DEFINIDA"
});

const app = express();

// ------------------------------------------------------------------
// ⭐ INICIO: CONFIGURACIÓN CORS CORREGIDA
//
// Usamos FRONTEND_URL de las variables de entorno para mayor seguridad.
// DEBES añadir una variable FRONTEND_URL en Render: 
// FRONTEND_URL = https://radiant-monstera-2d8e15.netlify.app
//
const allowedOrigin = FRONTEND_URL || 'http://localhost:3000'; // Default local para desarrollo

const corsOptions = {
    origin: (origin, callback) => {
        // Permite la URL del frontend Y permite peticiones sin 'origin' (como apps móviles o cURL)
        if (!origin || origin === allowedOrigin) {
            callback(null, true);
        } else {
            // Muestra error de origen no permitido en la consola del servidor
            console.error(❌ CORS: Origen no permitido: ${origin});
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Permite todos los métodos comunes
    credentials: true, // Vital para enviar cookies o tokens
    optionsSuccessStatus: 204 // Respuesta OK para preflight (OPTIONS)
};

// Reemplaza el simple 'app.use(cors());'
app.use(cors(corsOptions));
// ⭐ FIN: CONFIGURACIÓN CORS CORREGIDA
// ------------------------------------------------------------------


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
      console.log(🚀 Servidor escuchando en puerto ${PORT || 5000});
      console.log(🔗 Prueba: http://localhost:${PORT || 5000}/test);
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
