var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const db = require("../connection/index");

let hasil
async function getnamaacc(isi) {
    let no_rek = isi.no_rek
    let no_hp = isi.no_hp
    try {
        let request = await db.sequelize.query(
            "select noacc,fnama,stsrec,stsblok from m_tabunganc where noacc =?",
            {
                replacements: [no_rek],
                type: db.sequelize.QueryTypes.SELECT,
            }
        )
        hasil = {
            no_hp:no_hp,
            no_rek: no_rek,
            nama: request[0]["fnama"],
            stsrec: request[0]["stsrec"],
            stsblok: request[0]["stsblok"],
        };
        return hasil

    } catch (error) {
        hasil = nulll
        return hasil
    }
}

async function getbalance(isi) {
    let no_rek = isi
    try {
        let request = await db.sequelize.query(
            "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,stsblok from m_tabunganc where noacc =?",
            {
                replacements: [no_rek],
                type: db.sequelize.QueryTypes.SELECT,
            }
        )
        hasil = {
            no_rek: no_rek,
            nama: request[0]["fnama"],
            stsrec: request[0]["stsrec"],
            stsblok: request[0]["stsblok"],
            saldoakhir: request[0]["saldoakhir"],
            saldoeff: request[0]["saldoeff"],
        };
        return hasil

    } catch (error) {
        hasil = {
            no_rek: no_rek,
            nama: "Not Found",
            stsrec: "Not Found",
            stsblok: "Not Found",
            saldoakhir: "Not Found",
            saldoeff: "Not Found",
        };
        return hasil
    }
}
module.exports = { getnamaacc, getbalance }