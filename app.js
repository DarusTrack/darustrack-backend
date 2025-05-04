require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const academicYearsRouter = require('./routes/academic_years');
const semestersRouter = require('./routes/semesters')
const usersRouter = require('./routes/users');
const teachersRouter = require('./routes/teachers');
const parentsRouter = require('./routes/parents');
const headmasterRouter = require('./routes/headmaster');
const classesRouter = require('./routes/classes');
const studentsRouter = require('./routes/students');
const curriculumsRouter = require('./routes/curriculums');
const subjectsRouter = require('./routes/subjects');
const academicCalendarRouter = require('./routes/academic_calendar');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://darustrack.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // untuk preflight

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routing
app.use('/', indexRouter);
app.use('/academic-years', academicYearsRouter);
app.use('/semesters', semestersRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/teachers', teachersRouter);
app.use('/parents', parentsRouter);
app.use('/headmaster', headmasterRouter);
app.use('/classes', classesRouter);
app.use('/students', studentsRouter);
app.use('/curriculums', curriculumsRouter);
app.use('/subjects', subjectsRouter);
app.use('/academic-calendar', academicCalendarRouter);

// Database connection
const sequelize = require('./config/database');

sequelize.authenticate()
  .then(() => console.log('Database connected...'))
  .catch(err => console.error('Error connecting to database:', err));

module.exports = app;
