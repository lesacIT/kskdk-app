// backend/server.js
// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase, getDb } = require('./database');
const patientRoutes = require('./routes/patients');
const examRoutes = require('./routes/exams');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==================== MIDDLEWARE ====================
// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Static files serving
const frontendPath = path.join(__dirname, '../frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  console.log(`✅ Serving static files from: ${frontendPath}`);
} else {
  console.warn(`⚠️ Frontend directory not found: ${frontendPath}`);
}

// ==================== API ROUTES ====================
// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const db = getDb();
    res.json({
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      uptime: process.uptime(),
      database: db ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'ERROR',
      error: error.message
    });
  }
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'KSKDK Health Examination System',
    version: '1.0.0',
    description: 'Medical examination management system',
    endpoints: {
      patients: '/api/patients',
      examinations: '/api/exams',
      health: '/api/health'
    }
  });
});

// Patient routes
app.use('/api/patients', patientRoutes);

// Examination routes
app.use('/api/exams', examRoutes);

// ==================== FRONTEND ROUTES ====================
// Serve main HTML file
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>KSKDK - Not Found</title></head>
      <body>
        <h1>⚠️ Frontend not found</h1>
        <p>Please ensure the frontend files are in the correct directory.</p>
        <p>Expected path: ${indexPath}</p>
      </body>
      </html>
    `);
  }
});

// Serve other frontend routes
app.get('/index.html', (req, res) => {
  res.redirect('/');
});

// ==================== ERROR HANDLING ====================
// 404 handler for undefined routes
app.use((req, res) => {
  // Check if it's an API request
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.path}`
    });
  } else {
    // Try to serve index.html for SPA routing
    const indexPath = path.join(__dirname, '../frontend/index.html');
    if (fs.existsSync(indexPath)) {
      res.status(404).sendFile(indexPath);
    } else {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>404 - Page Not Found</title></head>
        <body>
          <h1>404 - Page Not Found</h1>
          <p>The requested page does not exist.</p>
          <a href="/">Go to Homepage</a>
        </body>
        </html>
      `);
    }
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  // Don't expose internal errors in production
  const errorMessage = NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;
  
  res.status(err.status || 500).json({
    success: false,
    error: errorMessage,
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==================== SERVER STARTUP ====================
async function startServer() {
  try {
    console.log('\n🚀 Starting KSKDK Health Examination System...\n');
    
    // Initialize database
    console.log('📦 Initializing database...');
    await initDatabase();
    console.log('✅ Database initialized successfully\n');
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                                                            ║');
      console.log('║   🏥 KSKDK HEALTH EXAMINATION SYSTEM                       ║');
      console.log('║   📍 Server is running successfully!                       ║');
      console.log('║                                                            ║');
      console.log(`║   🌐 Local:       http://localhost:${PORT}                    ║`);
      console.log(`║   🌍 Network:     http://${getLocalIP()}:${PORT}              ║`);
      console.log('║   📡 API:        http://localhost:' + PORT + '/api/health     ║');
      console.log('║                                                            ║');
      console.log(`║   🗄️  Database:   SQLite (${process.env.DB_PATH || './kskdk.db'})  ║`);
      console.log(`║   🌎 Environment: ${NODE_ENV}                               ║`);
      console.log('║   ⏰ Started at: ' + new Date().toLocaleString() + '          ║');
      console.log('║                                                            ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('\n✨ Ready to accept requests!\n');
    });
    
    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n⚠️ Received ${signal}, shutting down gracefully...`);
      server.close(async () => {
        console.log('✅ HTTP server closed');
        // Close database connection
        const db = getDb();
        if (db && db.close) {
          await db.close();
          console.log('✅ Database connection closed');
        }
        console.log('👋 Shutdown complete');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Force shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Helper function to get local IP address
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();