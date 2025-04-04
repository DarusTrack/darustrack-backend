require('dotenv').config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors'); // Tambahkan ini

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var usersRouter = require('./routes/users');
var teachersRouter = require('./routes/teachers');
var parentsRouter = require('./routes/parents');
var headMasterRouter = require('./routes/headmaster');
var classesRouter = require('./routes/classes');
var curriculumsRouter = require('./routes/curriculums');
var subjectsRouter = require('./routes/subjects');
var academicCalendarRouter = require('./routes/academic_calendar');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   next();
// });

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

const sequelize = require('./config/database');

sequelize.authenticate()
  .then(() => console.log('Database connected...'))
  .catch(err => console.error('Error connecting to database:', err));

module.exports = app;
