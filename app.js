require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const {
    PORT_API
} = process.env;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
// var inqueryacctRouter = require('./routes/inqueryacct');
var balancedinqueryRouter = require('./routes/Inquiry');
var PPOBRouter = require('./routes/PPOB');
var tariktunaiRouter = require('./routes/tariktunai');
var tokenrouter = require('./routes/token');
// var releasetartunrouter = require('./routes/releasetartun');
var transferoutrouter = require('./routes/transferout');
var transferinrouter = require('./routes/transferin');
var pindahbukurouter = require('./routes/pindahbuku');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
// app.use('/inqueryacct', inqueryacctRouter);
app.use('/Inquiry', balancedinqueryRouter);
app.use('/ppob', PPOBRouter);
app.use('/tariktunai', tariktunaiRouter);
app.use('/token', tokenrouter);
// app.use('/releasetartun', releasetartunrouter);
app.use('/transferout', transferoutrouter);
app.use('/transferin', transferinrouter);
app.use('/pindahbuku', pindahbukurouter);

// console.log(`API Run In  at http://localhost:${PORT_API}`);


module.exports = app;
