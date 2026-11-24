
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const os = require('os');

// =========================================================
// DATABASE
// =========================================================
const pool = require('./src/config/db');

const {
  programmerRappelsControles,
} = require('./src/controllers/controleController');

// =========================================================
// ROUTES
// =========================================================
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const abonneRoutes = require('./src/routes/abonneRoutes');
const compteurRoutes = require('./src/routes/compteurRoutes');
const releveRoutes = require('./src/routes/releveRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const statistiquesRoutes = require('./src/routes/statistiquesRoutes');
const graphiquesRoutes = require('./src/routes/graphiquesRoutes');
const anomalieRoutes = require('./src/routes/anomalieRoutes');
const comparaisonRoutes = require('./src/routes/comparaisonRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const geocodageRoutes = require('./src/routes/geocodageRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const responsableRoutes = require('./src/routes/responsableRoutes');
const agentRoutes = require('./src/routes/agentRoutes');
const paiementRoutes = require('./src/routes/paiementRoutes');

// =========================================================
// APPLICATION EXPRESS
// =========================================================
const app = express();

// =========================================================
// CONFIGURATION
// =========================================================
const PORT = Number(process.env.PORT) || 5000;

const HOST = '0.0.0.0';

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  'http://localhost:5173';

// =========================================================
// VERIFICATION CONFIGURATION
// =========================================================
if (!process.env.JWT_SECRET) {
  console.error(
    'ERREUR : JWT_SECRET absent du fichier .env'
  );

  process.exit(1);
}

if (!process.env.DB_NAME) {
  console.error(
    'ERREUR : DB_NAME absent du fichier .env'
  );

  process.exit(1);
}

// =========================================================
// DETECTION DES ADRESSES IPV4 DU PC
// =========================================================
function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();

  const addresses = [];

  for (const interfaceName of Object.keys(interfaces)) {
    const interfaceAddresses = interfaces[interfaceName] || [];

    for (const address of interfaceAddresses) {
      if (
        address.family === 'IPv4' &&
        !address.internal
      ) {
        addresses.push(address.address);
      }
    }
  }

  return [...new Set(addresses)];
}

// =========================================================
// SECURITE
// =========================================================
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

// =========================================================
// CORS
// =========================================================
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Les applications mobiles React Native
      // n'envoient généralement pas d'en-tête Origin.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`Origine CORS non autorisée : ${origin}`)
      );
    },

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],

    credentials: true,
  })
);

// =========================================================
// JSON
// =========================================================
app.use(
  express.json({
    limit: '1mb',
  })
);

// =========================================================
// URL ENCODED
// =========================================================
app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
  })
);

// =========================================================
// ROUTES API
// =========================================================

// AUTHENTIFICATION
app.use('/api/auth', authRoutes);

// UTILISATEURS
app.use('/api/users', userRoutes);

// ABONNES
app.use('/api/abonnes', abonneRoutes);

// COMPTEURS
app.use('/api/compteurs', compteurRoutes);

// RELEVES
app.use('/api/releves', releveRoutes);

// DASHBOARD
app.use('/api/dashboard', dashboardRoutes);

// STATISTIQUES
app.use('/api/statistiques', statistiquesRoutes);

// GRAPHIQUES
app.use('/api/graphiques', graphiquesRoutes);

// ANOMALIES
app.use('/api/anomalies', anomalieRoutes);

// COMPARAISON
app.use('/api/comparaison', comparaisonRoutes);

// NOTIFICATIONS
app.use('/api/notifications', notificationRoutes);

// PAIEMENTS
app.use('/api/paiements', paiementRoutes);

// PARAMETRES
app.use('/api/settings', settingsRoutes);

// GEOCODAGE
app.use('/api/geocodage', geocodageRoutes);

// RESPONSABLE
app.use('/api/responsable', responsableRoutes);

// AGENT
app.use('/api/agent', agentRoutes);

// =========================================================
// HEALTH CHECK SERVEUR
// =========================================================
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Serveur backend JIRAMA opérationnel.',
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    host: HOST,
    timestamp: new Date().toISOString(),
  });
});

// =========================================================
// HEALTH CHECK POSTGRESQL
// =========================================================
app.get('/api/health/db', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS date'
    );

    return res.status(200).json({
      status: 'success',
      database: 'PostgreSQL connecté',
      database_name: process.env.DB_NAME,
      date: result.rows[0].date,
    });
  } catch (error) {
    console.error(
      'Erreur PostgreSQL :',
      error.message
    );

    return res.status(500).json({
      status: 'error',
      database: 'PostgreSQL non connecté',
      message: 'Impossible de se connecter à PostgreSQL.',
    });
  }
});

// =========================================================
// API RACINE
// =========================================================
app.get('/api', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'API JIRAMA disponible.',
    routes: {
      auth: '/api/auth',
      users: '/api/users',
      abonnes: '/api/abonnes',
      compteurs: '/api/compteurs',
      releves: '/api/releves',
      dashboard: '/api/dashboard',
      statistiques: '/api/statistiques',
      graphiques: '/api/graphiques',
      anomalies: '/api/anomalies',
      comparaison: '/api/comparaison',
      notifications: '/api/notifications',
      paiements: '/api/paiements',
      settings: '/api/settings',
      geocodage: '/api/geocodage',
      responsable: '/api/responsable',
      agent: '/api/agent',
      health: '/api/health',
      database: '/api/health/db',
    },
  });
});

// =========================================================
// ROUTE TEST COMPARAISON
// =========================================================
app.get('/api/comparaison-test', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'La route comparaison est disponible.',
  });
});

// =========================================================
// ROUTE TEST AGENT
// =========================================================
app.get('/api/agent-test', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'La route Agent est disponible.',
    route: '/api/agent',
  });
});

// =========================================================
// ROUTE TEST RESPONSABLE
// =========================================================
app.get('/api/responsable-test', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'La route Responsable est disponible.',
    route: '/api/responsable',
  });
});

// =========================================================
// ROUTE 404
// =========================================================
app.use((req, res) => {
  return res.status(404).json({
    status: 'error',
    message: `Route non trouvée : ${req.method} ${req.originalUrl}`,
  });
});

// =========================================================
// GESTION GLOBALE DES ERREURS
// =========================================================
app.use((err, req, res, next) => {
  console.error(
    'Erreur serveur :',
    err.stack || err
  );

  // Erreur JSON invalide
  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    err.type === 'entity.parse.failed'
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Le JSON envoyé est invalide.',
    });
  }

  // Erreur CORS
  if (
    err.message &&
    err.message.startsWith('Origine CORS non autorisée')
  ) {
    return res.status(403).json({
      status: 'error',
      message: 'Origine non autorisée.',
    });
  }

  const statusCode =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status < 600
      ? err.status
      : 500;

  return res.status(statusCode).json({
    status: 'error',
    message:
      err.message ||
      'Erreur interne du serveur.',
  });
});

// =========================================================
// DEMARRAGE SERVEUR
// =========================================================
const server = app.listen(PORT, HOST, () => {
  console.log('');

  console.log('==========================================');
  console.log('         BACKEND JIRAMA DEMARRE');
  console.log('==========================================');

  console.log(`Serveur local : http://localhost:${PORT}`);
  console.log(`Adresse écoute : ${HOST}:${PORT}`);
  console.log(`API : http://localhost:${PORT}/api`);
  console.log(`Health : http://localhost:${PORT}/api/health`);
  console.log(`Database : http://localhost:${PORT}/api/health/db`);

  console.log('');
  console.log('ADRESSES RESEAU POUR MOBILE :');

  const localAddresses = getLocalIPv4Addresses();

  if (localAddresses.length > 0) {
    for (const ip of localAddresses) {
      console.log(`API mobile : http://${ip}:${PORT}/api`);
      console.log(`Health mobile : http://${ip}:${PORT}/api/health`);
    }
  } else {
    console.log(
      'Aucune adresse IPv4 locale détectée.'
    );
  }

  console.log('');
  console.log(`Frontend autorisé : ${FRONTEND_URL}`);
  console.log(`Environnement : ${process.env.NODE_ENV || 'development'}`);

  console.log('==========================================');
  console.log('');

  // Programmation des rappels
  try {
    programmerRappelsControles();
  } catch (error) {
    console.error(
      'Erreur programmation rappels :',
      error.message
    );
  }
});

// =========================================================
// ERREURS DEMARRAGE SERVEUR
// =========================================================
server.on('error', (error) => {
  console.error('');

  console.error('==========================================');
  console.error('ERREUR DE DEMARRAGE BACKEND JIRAMA');
  console.error('==========================================');

  if (error.code === 'EADDRINUSE') {
    console.error(
      `Le port ${PORT} est déjà utilisé.`
    );

    console.error(
      'Fermez le processus qui utilise ce port ou modifiez PORT dans .env.'
    );
  } else if (error.code === 'EACCES') {
    console.error(
      `Permission refusée pour le port ${PORT}.`
    );
  } else {
    console.error(error);
  }

  console.error('==========================================');

  process.exit(1);
});

// =========================================================
// ARRET PROPRE
// =========================================================
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(
    `\nSignal ${signal} reçu. Arrêt du serveur...`
  );

  server.close(async () => {
    try {
      await pool.end();

      console.log(
        'Serveur et PostgreSQL arrêtés proprement.'
      );

      process.exit(0);
    } catch (error) {
      console.error(
        'Erreur fermeture PostgreSQL :',
        error.message
      );

      process.exit(1);
    }
  });

  // Evite que l'arrêt reste bloqué indéfiniment
  setTimeout(() => {
    console.error(
      'Arrêt forcé du serveur après délai.'
    );

    process.exit(1);
  }, 10000).unref();
}

// =========================================================
// SIGINT
// =========================================================
process.on('SIGINT', () => {
  shutdown('SIGINT');
});

// =========================================================
// SIGTERM
// =========================================================
process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
