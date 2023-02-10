var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const db = require("../connection/index");

async function gettanggal() {
    let hasil
    try {
        let tgl = await db.sequelize.query(
            "select * from tanggal",
            {
                replacements: [],
                type: db.sequelize.QueryTypes.SELECT,
            }
        )
        hasil = tgl[0]["tgl"]
        tgltrn = hasil.substr(4,4)+hasil.substr(2,2)+hasil.substr(0,2)
        return tgltrn

    } catch (err) {
    }

}
module.exports = { gettanggal }