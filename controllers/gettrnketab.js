var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const db = require("../connection/index");

async function gettrnke(no_rek) {
    let hasil
    try {
        let request = await db.sequelize.query(
            "select trnke from m_tabunganc where noacc=?",
            {
                replacements: [no_rek],
                type: db.sequelize.QueryTypes.SELECT
            }
        );
        hasil = request[0]["trnke"];
        return hasil;
    }catch(error){
        return hasil;
    }
};
module.exports = { gettrnke }