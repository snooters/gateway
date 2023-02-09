require('dotenv').config();
var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const db = require("../connection/index");
const { getnamaacc } = require('../controllers/inqueryacct');
const { getbalance } = require('../controllers/inqueryacct');
const v = new Validator();
const {
    rek_tidakada,
    rek_tutup,
    saldo_kurang,
    rek_blokir,
    USER_ID,
    BATCH,
    Inquiry_Account,
    Sign_In,
    Sign_Off,
    Inquiry_Balance,
    invelid_transaction,
    Successful,
    rek_notauth } = process.env;

router.post('/', async (req, res) => {
    const schema = {
        bpr_id: 'string',
        trx_code: 'string',
        trx_type: 'string',
        tgl_trans: 'string',
        rrn: 'string'
    }

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res
            .status(200)
            .json(validate);
    }

    let { bpr_id, trx_code, trx_type, tgl_trans, tgl_transmis, rrn, data } = req.body;

    if (trx_code == Inquiry_Account) {
        let hasil = await getnamaacc(data)
        let stsrec = hasil.stsrec
        let stsblok = hasil.stsblok
        let no_rek = hasil.no_rek
        let nama_rek = hasil.nama
        let no_hp = hasil.no_hp

        // jika status rekening belum di otorisasi
        if (stsrec == "N") {
            return res.status(200).send({
                code: rek_notauth,
                status: "GAGAL",
                message: "Rekening Belum Diotorisasi",
                rrn: rrn,
                data: null
            });
            // jika status rekening tutup
        } else if (stsrec == "C") {
            return res.status(200).send({
                code: rek_tutup,
                status: "GAGAL",
                message: "Rekening Tutup",
                rrn: rrn,
                data: null
            });
            // jika status rekening tutup
        } else if (stsrec == "T") {
            return res.status(200).send({
                code: rek_tutup,
                status: "GAGAL",
                message: "Rekening Tutup",
                rrn: rrn,
                data: null
            });
            // jika status rekening aktif
        } else if (stsrec == "A") {
            // jika status rekening diblokir
            if (stsblok == "R") {
                return res.status(200).send({
                    code: rek_blokir,
                    status: "GAGAL",
                    message: "Rekening Rekening Diblokir",
                    rrn: rrn,
                    data: null
                });
            } else {
                // jika status rekening tidak diblokir
                return res.status(200).send({
                    code: Successful,
                    status: "SUKSES",
                    message: "SUKSES",
                    rrn: rrn,
                    data: {
                        bpr_id: bpr_id,
                        trx_code: trx_code,
                        trx_type: trx_type,
                        tgl_trans: tgl_trans,
                        tgl_transmis: tgl_transmis,
                        rrn: rrn,
                        no_hp: no_hp,
                        no_rek: no_rek,
                        nama_rek: nama_rek
                    }
                });
            }

        } else {
            // jika rekening tidak ditemukan
            return res.status(200).send({
                code: rek_tidakada,
                status: "GAGAL",
                message: "Rekening Tidak Terdaftar",
                rrn: rrn,
                data: null
            });
        }

    } else if (trx_code == Inquiry_Balance) {
        var value = []
        let jsonstring
        for (i in data) {
            let no_hp = data[i].no_hp
            let no_rek = data[i].no_rek
            let hasil = await getbalance(no_rek)
            let stsrec = hasil.stsrec
            let stsblok = hasil.stsblok
            let nama_rek = hasil.nama
            let saldoakhir = hasil.saldoakhir
            let saldoeff = hasil.saldoeff
            value.push({
                no_hp: no_hp,
                no_rek: no_rek,
                nama_rek: nama_rek,
                saldoakhir: saldoakhir,
                saldoeff: saldoeff
            })
        }
        // console.log(value)
        return res.status(200).send({
            code: Successful,
            status: "SUKSES",
            message: "SUKSES",
            rrn: rrn,
            data: {
                bpr_id: bpr_id,
                trx_code: trx_code,
                trx_type: trx_type,
                tgl_trans: tgl_trans,
                tgl_transmis: tgl_transmis,
                rrn: rrn,
                data: value
            }
        })

    } else {
        // jika transaksi code tidak ada
        return res.status(200).send({
            code: rek_tidakada,
            status: "GAGAL",
            message: trx_code + " Tidak Terdaftar",
            rrn: rrn,
            data: null
        });
    };
});

module.exports = router;