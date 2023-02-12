var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const db = require("../connection/index");

let hasil
async function getnamaacc(noacc, gl_jns,bpr_id) {
    let no_rek = noacc
    let jnsrek = gl_jns
    if (jnsrek == "1") {

        try {
            let gl = await db.sequelize.query(
                "select * from tblgl where nosbb=? and kategori='C'",
                {
                    replacements: [no_rek],
                    type: db.sequelize.QueryTypes.SELECT,
                }
            );

            hasil = {
                nama: gl[0]["nmsbb"],
                stsrec: "A",
                stsblok: "",
            }

        } catch (error) {
            hasil = {
                nama: "Not Found",
                stsrec: "Not Found",
                stsblok: "Not Found",
            }
        }

        return hasil


    } else if (jnsrek == "2") {
        // inquery tabungan
        try {
            let request = await db.sequelize.query(
                "select noacc,trnke,fnama,stsrec,stsblok,(select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab from m_tabunganc where noacc =? and nocif=?",
                {
                    replacements: [no_rek,bpr_id],
                    type: db.sequelize.QueryTypes.SELECT,
                }
            )
            hasil = {
                no_rek: no_rek,
                nama: request[0]["fnama"],
                stsrec: request[0]["stsrec"],
                stsblok: request[0]["stsblok"],
                sbbtab: request[0]["sbbtab"],
                trnke: request[0]["trnke"],
            };
            return hasil

        } catch (error) {
            hasil = {
                no_rek: no_rek,
                nama: "Not Found",
                stsrec: "Not Found",
                stsblok: "Not Found",
                sbbtab: "Not Found"
            };
            return hasil
        }
    }
}

async function getbalance(noacc, gl_jns,bpr_id) {
    let no_rek = noacc
    let jnsrek = gl_jns
    if (jnsrek == "1") {
       
        try {
            let gl = await db.sequelize.query(
                "select sum(saldoakhir) as totsaldo,namaaccount from m_gl where nosbb=? and kategori='C'GROUP by namaaccount",
                {
                    replacements: [no_rek],
                    type: db.sequelize.QueryTypes.SELECT,
                }
            );

            hasil = {
                nama: gl[0]["namaaccount"],
                saldoakhir: gl[0]["totsaldo"],
                stsrec: "A",
                stsblok: "",
            }
        } catch (err) {
            hasil = {
                nama: "Not found",
                saldoakhir: "Not found",
                stsrec: "Not found",
                stsblok: "Not found",
            }
        }
        return hasil


    } else if (jnsrek == "2") {
        try {
            let request = await db.sequelize.query(
                "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,stsblok,(select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke from m_tabunganc where noacc =? and nocif=?",
                {
                    replacements: [no_rek,bpr_id],
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
                sbbtab: request[0]["sbbtab"],
                trnke: request[0]["trnke"],
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
                sbbtab: "Not Found",
            };
            return hasil
        }
    }
}
module.exports = { getnamaacc, getbalance }