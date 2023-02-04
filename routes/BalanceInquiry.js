require('dotenv').config();
var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const db = require("../connection/index");
const v = new Validator();

const {
    rek_tidakada,
    rek_tutup,
    saldo_kurang,
    rek_blokir,
    USER_ID,
    BATCH } = process.env;

router.get('/', async (req, res) => {
    const schema = {
        no_rek: 'string',
        trx_code: 'string',
        terminal_id: 'string',
        rrn:'string'
    }

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res
            .status(400)
            .json(validate);
    }

    let { no_rek, trx_code,rrn } = req.body;

    // cek status closing
    let stsclose = await db.sequelize.query(
        "select stsclose from TOFCLOSE where stsclose='C'",
        {
            type: db.sequelize.QueryTypes.SELECT,
        }
    );
    //reset nomor transaksi
    if (stsclose.length) {
        let [notrn, metadata] = await db.sequelize.query(
            "update nomaster set nomor = 0 where batch in (select batch from terminal_atm)",
            {
            }
        )
        return res.status(403).send({
            code: "403",
            status: "GAGAL",
            message: "Sedang Melakukan Closing",
            rrn:rrn,
            data: null
        });
    }

    try {
        let request = await db.sequelize.query(
            "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec from m_tabunganc where noacc =?",
            {
                replacements: [no_rek],
                type: db.sequelize.QueryTypes.SELECT,
            }
        )
        if (request.length) {
            console.log('================================================================');
            console.log("Inquiry Rekening ");

            if (request[0]["stsrec"] == null) {
                console.log("Status Gagal ");
                console.log("message: Rekening Tidak Ditemukan ");

                return res.status(400).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Tidak Ditemukan",
                    rrn:rrn,
                    data: null
                });


            } else if (request[0]["stsrec"] == "N") {

                console.log("Status Gagal ");
                console.log("message: Rekening Tidak Aktif");

                return res.status(400).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Tidak Aktif",
                    rrn:rrn,
                    data: null
                });


            } else if (request[0]["stsrec"] == "T") {

                console.log("Status Gagal ");
                console.log("message: Rekening Tutup");

                return res.status(400).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Tutup",
                    rrn:rrn,
                    data: null
                });


            } else if (request[0]["stsrec"] == "C") {

                console.log("Status Gagal ");
                console.log("message: Rekening Tutup");

                return res.status(400).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Tutup",
                    rrn:rrn,
                    data: null
                });


            } else if (request[0]["stsrec"] == "D") {

                console.log("Status Gagal ");
                console.log("message: Rekening Dihapus");

                return res.status(400).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Dihapus",
                    rrn:rrn,
                    data: null
                });


            } else if (request[0]["stsrec"] == "A") {
                // proses get  nama rekening
                if (trx_code == '01') {

                    console.log("Status Sukses ");
                    console.log("No Rekening: " + request[0]["noacc"]);
                    console.log("Nama Rekening: " + request[0]["fnama"]);

                    return res.status(200).send({
                        code: "000",
                        status: "OK",
                        message: "SUKSES",
                        rrn:rrn,
                        data: {
                            "norek": request[0]["noacc"],
                            "nama:": request[0]["fnama"]
                        }
                    });
                    //proses get saldo
                } else if (trx_code == '02') {

                    console.log("Status Sukses");
                    console.log("No Rekening: " + request[0]["noacc"]);
                    console.log("Nama Rekening: " + request[0]["fnama"]);
                    return res.status(200).send({
                        code: "000",
                        status: "OK",
                        message: "SUKSES",
                        rrn:rrn,
                        data: {
                            "norek": request[0]["noacc"],
                            "nama:": request[0]["fnama"],
                            "saldoakhir": request[0]["saldoakhir"],
                            "saldoeff": request[0]["saldoeff"],
                        }
                    });

                } else {

                    console.log("Status Gagal ");
                    console.log("message: Trx Code Tidak Ditemukan");

                    return res.status(400).send({
                        code: "404",
                        status: "GAGAL",
                        message: "Trx Code Tidak Ditemukan",
                        rrn:rrn,
                        data: null
                    });

                }
            } else {

                console.log("Status Gagal ");
                console.log("No rekening Tidak Ditemukan");

                return res.status(400).send({
                    code: "404",
                    status: "GAGAL",
                    message: "No rekening Tidak Ditemukan",
                    rrn:rrn,
                    data: null
                });

            }

        } else {


            console.log("Status Gagal ");
            console.log("No rekening Tidak Ditemukan");

            return res.status(400).send({
                code: "404",
                status: "GAGAL",
                message: "No rekening Tidak Ditemukan",
                rrn:rrn,
                data: null
            });
        }

    } catch (error) {
        console.log('Error Inquiry Account', error);
        return res.status(400).send({ error });
    }

});

module.exports = router;