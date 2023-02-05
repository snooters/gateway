var express = require('express');
var app = express();
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
// var inqueryacctRouter = require('./routes/inqueryacct');
var balancedinqueryRouter = require('./routes/Inquiry');
var PPOBRouter = require('./routes/PPOB');
var tariktunaiRouter = require('./routes/tariktunai');

const { sequelize } = require("./connection");

sequelize
  .authenticate()
  .then((db) => {
    console.log("CONNECTION ESTABLISHED! ");
  })
  .catch((err) => {
    console.error("UNABLE TO ESTABLISH CONNECTION: ", err);
  });

  const port = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.raw());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
app.use('/users', usersRouter);
// app.use('/inqueryacct', inqueryacctRouter);
app.use('/inquiry', balancedinqueryRouter);
app.use('/ppob', PPOBRouter);
app.use('/tariktunai', tariktunaiRouter);

app.get("/", (req, res) => {
  res.send("gateway-api");
});

// console.log(`API Run In  at http://localhost:${PORT_API}`);
app.listen(port, () => {
    console.log(`Gateway-API listening at http://localhost:${port}`);
  });


module.exports = app;
