require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const apicache = require('apicache');

const app = express();
const cache = apicache.middleware;

const allowedOrigins = [
  'http://localhost:3000',
  'https://darustrack.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(logger('dev'));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Response Time Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} - ${Date.now() - start}ms`);
  });
  next();
});

// Routing
app.use('/auth', require('./routes/auth'));
app.use('/academic-years', cache('2 minutes'), require('./routes/academic_years'));
app.use('/semesters', cache('2 minutes'), require('./routes/semesters'));
app.use('/users', require('./routes/users'));
app.use('/teachers', require('./routes/teachers'));
app.use('/parents', require('./routes/parents'));
app.use('/headmaster', require('./routes/headmaster'));
app.use('/classes', cache('2 minutes'), require('./routes/classes'));
app.use('/students', require('./routes/students'));
app.use('/curriculums', require('./routes/curriculums'));
app.use('/subjects', require('./routes/subjects'));

// DB Connection
const sequelize = require('./config/database');
sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('DB connection error:', err));

module.exports = app;
