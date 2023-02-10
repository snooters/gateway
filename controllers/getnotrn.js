var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const db = require("../connection/index");

let hasil

async function getnotrn(batch) {
    try {
        let notrn = await db.sequelize.query(
            "select nomor + 10 as notrn from nomaster where batch=?",
            {
                replacements: [batch],
                type: db.sequelize.QueryTypes.SELECT,
            }

        )
        hasil = notrn[0]["notrn"]

    } catch (err) {
        hasil = 10
        return hasil
    }

    try {
        await db.sequelize.query(
            "update nomaster set nomor=? where batch=?",
            {
                replacements: [hasil, batch],
            }
        )
    } catch (err) {

    }

    return hasil
}
module.exports = { getnotrn };