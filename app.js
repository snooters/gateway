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
var inqueryacctRouter = require('./routes/inqueryacct');
var balancedinqueryRouter = require('./routes/BalanceInquiry');
var PPOBRouter = require('./routes/PPOB');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/inqueryacct', inqueryacctRouter);
app.use('/BalanceInquiry', balancedinqueryRouter);
app.use('/ppob', PPOBRouter);

console.log(`WELCOME TO BPR ANGGA API at http://localhost:${PORT_API}`);


module.exports = app;
