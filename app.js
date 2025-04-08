require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const teachersRouter = require('./routes/teachers');
const parentsRouter = require('./routes/parents');
const headMasterRouter = require('./routes/headmaster');
const classesRouter = require('./routes/classes');
const curriculumsRouter = require('./routes/curriculums');
const subjectsRouter = require('./routes/subjects');
const academicCalendarRouter = require('./routes/academic_calendar');

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'https://darustrack-frontend.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Debug header CORS
app.use((req, res, next) => {
  console.log("CORS headers:", res.getHeaders());
  next();
});

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routing
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/teachers', teachersRouter);
app.use('/parents', parentsRouter);
app.use('/headmaster', headMasterRouter);
app.use('/classes', classesRouter);
app.use('/curriculums', curriculumsRouter);
app.use('/subjects', subjectsRouter);
app.use('/academic-calendar', academicCalendarRouter);

// Database connection
const sequelize = require('./config/database');

sequelize.authenticate()
  .then(() => console.log('✅ Database connected...'))
  .catch(err => console.error('❌ Error connecting to database:', err));

module.exports = app;
