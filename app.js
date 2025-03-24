require('dotenv').config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// const swaggerUi = require('swagger-ui-express');
// const apiDocumentation = require('./apidocs.json');
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiDocumentation));

var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');
var usersRouter = require('./routes/users');
var teachersRouter = require('./routes/teachers');
var parentsRouter = require('./routes/parents');
var classesRouter = require('./routes/classes');
var curriculumsRouter = require('./routes/curriculums');
var subjectsRouter = require('./routes/subjects');
var gradesRouter = require('./routes/grades');
var attendancesRouter = require('./routes/attendances');
var evaluationsRouter = require('./routes/evaluations');
var academicCalendarRouter = require('./routes/academic_calendar');

var app = express();

app.use(logger('dev'));
app.use(express.json());

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/teachers', teachersRouter);
app.use('/parents', parentsRouter);
app.use('/classes', classesRouter);
app.use('/curriculums', curriculumsRouter);
app.use('/subjects', subjectsRouter);
app.use('/grades', gradesRouter);
app.use('/attendances', attendancesRouter);
app.use('/evaluations', evaluationsRouter);
app.use('/academic-calendar', academicCalendarRouter);

const sequelize = require('./config/database');

sequelize.authenticate()
  .then(() => console.log('Database connected...'))
  .catch(err => console.error('Error connecting to database:', err));

module.exports = app;
