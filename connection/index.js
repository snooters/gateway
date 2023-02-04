require('dotenv').config();
const { Sequelize } = require("sequelize");
const {
    DB_USERNAME,
    DB_PASSWORD,
    DB_PORT,
    DB_HOST,
    DB_DATABASE,
    DB_DIALECT
  } = process.env;


let name = DB_DATABASE;
let username = DB_USERNAME;
let pass = DB_PASSWORD;
let host = DB_HOST;

const sequelize = new Sequelize(name, username, pass, {
  host,
  dialect: DB_DIALECT,
//   logging: (...msg) => console.log(DateTime() + " ----- " + msg),
  pool: {
    max: 10000,
    min: 0,
    idle: 10000,
  },
  dialectOptions: { connectionTimeoutMillis: 600000 },
});

module.exports = { sequelize };
