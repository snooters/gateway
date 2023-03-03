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

    let { bpr_id, trx_code, trx_type, tgl_trans, tgl_transmis, rrn, data, gl_jns, no_rek } = req.body;

    if (trx_code == Inquiry_Account) {
        let hasil
        if (!no_rek) {
            hasil = await getnamaacc(data.no_rek, data.gl_jns, bpr_id)
        } else {
            hasil = await getnamaacc(no_rek, gl_jns, bpr_id)
        }
        let stsrec = hasil.stsrec
        let stsblok = hasil.stsblok
        let no_rek1 = hasil.no_rek
        let nama = hasil.nama

        let sts
        switch (stsrec) {
            case "N":
                sts = "REKENING TIDAK AKTIF"
                break;
            case "C":
                sts = "REKENING TUTUP"
                break;
            case "T":
                sts = "REKENING TUTUP"
                break;
            case "A":
                if (stsblok == "R") {
                    sts = "REKENING DIBLOKIR"
                } else {
                    sts = "AKTIF"
                }
                break;
            default:
                sts = "REK SALAH"
        }
        // jika status rekening belum di otorisasi
        if (stsrec == "N") {
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
                    no_rek: no_rek1,
                    nama: nama,
                    status_rek: sts
                }
            });
            // jika status rekening tutup
        } else if (stsrec == "C") {
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
                    no_rek: no_rek1,
                    nama: nama,
                    status_rek: sts
                }
            });
            // jika status rekening tutup
        } else if (stsrec == "T") {
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
                    no_rek: no_rek1,
                    nama: nama,
                    status_rek: sts
                }
            });
            // jika status rekening aktif
        } else if (stsrec == "A") {
            // jika status rekening diblokir
            if (stsblok == "R") {
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
                        no_rek: no_rek1,
                        nama: nama,
                        status_rek: sts
                    }
                });
            } else {
                // jika status rekening tidak diblokir
                return res.status(200).send({
                    code: Successful,
                    status: "SUKSES",
                    message: "SUKSES",
                    rrn: rrn,
                    data: [{
                        bpr_id: bpr_id,
                        trx_code: trx_code,
                        trx_type: trx_type,
                        tgl_trans: tgl_trans,
                        tgl_transmis: tgl_transmis,
                        rrn: rrn,
                        no_rek: no_rek1,
                        nama_rek: nama,
                        status_rek: sts
                    }]
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
            let no_rek = data[i].no_rek
            let gl_jns = data[i].gl_jns
            let hasil = await getbalance(no_rek, gl_jns, bpr_id)
            let stsrec = hasil.stsrec
            let stsblok = hasil.stsblok
            let nama = hasil.nama
            let saldoakhir = hasil.saldoakhir
            let saldoeff = hasil.saldoeff
            let sts
            switch (stsrec) {
                case "N":
                    sts = "REKENING TIDAK AKTIF"
                    break;
                case "C":
                    sts = "REKENING TUTUP"
                    break;
                case "T":
                    sts = "REKENING TUTUP"
                    break;
                case "A":
                    if (stsblok == "R") {
                        sts = "REKENING DIBLOKIR"
                    } else {
                        sts = "AKTIF"
                    }
                    break;
                default:
                    sts = "REKENING SALAH"
            }
            value.push({
                no_rek: no_rek,
                nama: nama,
                saldoakhir: saldoakhir,
                saldoeff: saldoeff,
                status_rek: sts
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
            code: invelid_transaction,
            status: "GAGAL",
            message: "TRX_CODE " + trx_code + " Tidak Terdaftar",
            rrn: rrn,
            data: null
        });
    };
});

module.exports = router;