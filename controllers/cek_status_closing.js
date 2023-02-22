var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const db = require("../connection/index");

let hasil

async function cekclosing() {

    try {
        let closing = await db.sequelize.query(
            "select status_closing from sts_closing",
            {
                replacements: [],
                type: db.sequelize.QueryTypes.SELECT,
            }

        )
        hasil = closing[0]["status_closing"]
        return hasil
    } catch (err) {
        hasil = "not found"
        return hasil
    }
}
module.exports = { cekclosing };