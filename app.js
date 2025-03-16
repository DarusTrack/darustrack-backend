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
var classesRouter = require('./routes/classes');
var studentsRouter = require('./routes/students');
var curriculumsRouter = require('./routes/curriculums');
var subjectsRouter = require('./routes/subjects');
var gradesRouter = require('./routes/grades');
var attendancesRouter = require('./routes/attendances');
var evaluationsRouter = require('./routes/evaluations');
var schedulesRouter = require('./routes/schedules');
var schoolCalendarRouter = require('./routes/school_calendar');

var app = express();

app.use(logger('dev'));
app.use(express.json());

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/classes', classesRouter);
app.use('/students', studentsRouter);
app.use('/curriculums', curriculumsRouter);
app.use('/subjects', subjectsRouter);
app.use('/grades', gradesRouter);
app.use('/attendances', attendancesRouter);
app.use('/evaluations', evaluationsRouter);
app.use('/schedules', schedulesRouter);
app.use('/school-calendar', schoolCalendarRouter);

module.exports = app;
