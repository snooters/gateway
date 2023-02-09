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
        rrn: 'string',
        data:'object'
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


    // //    ==============================================================================================
    //     if (trx_code == Inquiry_Account) {
    //         return res.status(200).send({
    //             code: Successful,
    //             status: "SUKSES",
    //             message: "SUKSES",
    //             rrn: rrn,
    //             data: {
    //                 bpr_id: bpr_id,
    //                 trx_code: trx_code,
    //                 trx_type: trx_type,
    //                 tgl_trans: tgl_trans,
    //                 tgl_transmis: tgl_transmis,
    //                 rrn: rrn,
    //                 no_hp: "087877456600",
    //                 no_rek: "1000101201000001",
    //                 nama_rek: "FADLY"
    //             }
    //         });
    //     } else if (trx_code == Inquiry_Balance) {
    //         return res.status(200).send({
    //             code: Successful,
    //             status: "SUKSES",
    //             message: "SUKSES",
    //             rrn: rrn,
    //             data: {
    //                 bpr_id: bpr_id,
    //                 trx_code: trx_code,
    //                 trx_type: trx_type,
    //                 tgl_trans: tgl_trans,
    //                 rrn: rrn,
    //                 tgl_transmis: tgl_transmis,
    //                 data: [{
    //                     "no_hp": "087877456600",
    //                     "no_rek": "1000101201000001",
    //                     "nama_rek:": "FADLY",
    //                     "saldoakhir": 150000,
    //                     "saldoeff": 100000
    //                 },
    //                 {
    //                     "no_hp": "08989872345",
    //                     "no_rek": "987654321",
    //                     "nama_rek:": "ARYA",
    //                     "saldoakhir": 50000,
    //                     "saldoeff": 25000
    //                 },
    //                 {
    //                     "no_hp": "",
    //                     "no_rek": "123456788",
    //                     "nama_rek:": "GL PENAMPUNGAN DANA",
    //                     "saldoakhir": 200000,
    //                     "saldoeff": 0
    //                 }
    //                 ]
    //             }
    //         });
    //     } else {

    //     }
    //     let print = "============================================================"

    //     // cek status closing
    //     let stsclose = await db.sequelize.query(
    //         "select stsclose from TOFCLOSE where stsclose='C'",
    //         {
    //             type: db.sequelize.QueryTypes.SELECT,
    //         }
    //     );
    //     //reset nomor transaksi
    //     if (stsclose.length) {
    //         let [notrn, metadata] = await db.sequelize.query(
    //             "update nomaster set nomor = 0 where batch in (select batch from terminal_atm)",
    //             {
    //             }
    //         )
    //         return res.status(200).send({
    //             code: Sign_Off,
    //             status: "GAGAL",
    //             message: "Sedang Melakukan Closing",
    //             rrn: rrn,
    //             data: null
    //         });
    //     };

    //     if (trx_code == Inquiry_Account) {
    //         // get data account
    //         for (i in data) {
    //             noacc = data[i].no_rek
    //             try {
    //                 let request = await db.sequelize.query(
    //                     "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,stsblok from m_tabunganc where noacc =?",
    //                     {
    //                         replacements: [noacc],
    //                         type: db.sequelize.QueryTypes.SELECT
    //                     }
    //                 );
    //                 if (request.length) {

    //                 } else {
    //                     res.status(200).send({
    //                         code: rek_tidakada,
    //                         status: "GAGAL",
    //                         message: "Rekening Tidak Ditemukan",
    //                         rrn: rrn,
    //                         data: null
    //                     });

    //                     print = print + '\r\n' + "code :" + rek_tidakada + '\r\n' + "status : GAGAL" + '\r\n' + "message : Rekening Tidak Ada"

    //                     console.log(print)
    //                 }

    //             } catch (error) {
    //                 res.status(200).send(error);
    //             };


    //         };

    //     } else if (trx_code == Inquiry_Balance) {


    //     };
    //     return
    //     // ============================================================================
    //     try {
    //         let request = await db.sequelize.query(
    //             "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,stsblok from m_tabunganc where noacc =?",
    //             {
    //                 replacements: [no_rek],
    //                 type: db.sequelize.QueryTypes.SELECT,
    //             }
    //         )
    //         if (request.length) {
    //             console.log('================================================================');
    //             console.log("Inquiry Rekening ");

    //             if (request[0]["stsrec"] == null) {
    //                 console.log("Status Gagal ");
    //                 console.log("message: Rekening Tidak Ditemukan ");

    //                 return res.status(200).send({
    //                     code: rek_tidakada,
    //                     status: "GAGAL",
    //                     message: "Rekening Tidak Ditemukan",
    //                     rrn: rrn,
    //                     data: null
    //                 });


    //             } else if (request[0]["stsrec"] == "N") {

    //                 console.log("Status Gagal ");
    //                 console.log("message: Rekening Tidak Aktif");

    //                 return res.status(200).send({
    //                     code: rek_notauth,
    //                     status: "GAGAL",
    //                     message: "Rekening Tidak Aktif",
    //                     rrn: rrn,
    //                     data: null
    //                 });


    //             } else if (request[0]["stsrec"] == "T") {

    //                 console.log("Status Gagal ");
    //                 console.log("message: Rekening Tutup");

    //                 return res.status(200).send({
    //                     code: rek_tutup,
    //                     status: "GAGAL",
    //                     message: "Rekening Tutup",
    //                     rrn: rrn,
    //                     data: null
    //                 });


    //             } else if (request[0]["stsrec"] == "C") {

    //                 console.log("Status Gagal ");
    //                 console.log("message: Rekening Tutup");

    //                 return res.status(200).send({
    //                     code: rek_tutup,
    //                     status: "GAGAL",
    //                     message: "Rekening Tutup",
    //                     rrn: rrn,
    //                     data: null
    //                 });


    //             } else if (request[0]["stsrec"] == "D") {

    //                 console.log("Status Gagal ");
    //                 console.log("message: Rekening Dihapus");

    //                 return res.status(200).send({
    //                     code: rek_notauth,
    //                     status: "GAGAL",
    //                     message: "Rekening Dihapus",
    //                     rrn: rrn,
    //                     data: null
    //                 });


    //             } else if (request[0]["stsrec"] == "A") {
    //                 // check status blokir
    //                 if (request[0]["stsblok"] == "R") {
    //                     return res.status(200).send({
    //                         code: rek_blokir,
    //                         status: "GAGAL",
    //                         message: "Rekening Diblokir",
    //                         rrn: rrn,
    //                         data: null
    //                     });
    //                 };
    //                 // proses get  nama rekening
    //                 if (trx_code == Inquiry_Account) {

    //                     console.log("Status Sukses ");
    //                     console.log("No Rekening: " + request[0]["noacc"]);
    //                     console.log("Nama Rekening: " + request[0]["fnama"]);

    //                     return res.status(200).send({
    //                         code: Successful,
    //                         status: "OK",
    //                         message: "SUKSES",
    //                         data: {
    //                             "no_hp": no_hp,
    //                             "norek": request[0]["noacc"],
    //                             "nama:": request[0]["fnama"],
    //                             "bpr_id": bpr_id,
    //                             "tgl_trans": tgl_trans,
    //                             "trx_code": trx_code,
    //                             "trx_type": trx_type,
    //                             "rrn": rrn
    //                         }
    //                     });
    //                     //proses get saldo
    //                 } else if (trx_code == Inquiry_Balance) {

    //                     console.log("Status Sukses");
    //                     console.log("No Rekening: " + request[0]["noacc"]);
    //                     console.log("Nama Rekening: " + request[0]["fnama"]);
    //                     return res.status(200).send({
    //                         code: Successful,
    //                         status: "OK",
    //                         message: "SUKSES",
    //                         rrn: rrn,
    //                         data: {
    //                             "no_hp": no_hp,
    //                             "norek": request[0]["noacc"],
    //                             "nama:": request[0]["fnama"],
    //                             "bpr_id": bpr_id,
    //                             "tgl_trans": tgl_trans,
    //                             "trx_code": trx_code,
    //                             "trx_type": trx_type,
    //                             "rrn": rrn,
    //                             "saldoakhir": request[0]["saldoakhir"],
    //                             "saldoeff": request[0]["saldoeff"]

    //                         }
    //                     });

    //                 } else {

    //                     console.log("Status Gagal ");
    //                     console.log("message: Trx Code Tidak Ditemukan");

    //                     return res.status(200).send({
    //                         code: rek_tidakada,
    //                         status: "GAGAL",
    //                         message: "Trx Code Tidak Ditemukan",
    //                         rrn: rrn,
    //                         data: null
    //                     });

    //                 }
    //             } else {

    //                 console.log("Status Gagal ");
    //                 console.log("No rekening Tidak Ditemukan");

    //                 return res.status(200).send({
    //                     code: rek_tidakada,
    //                     status: "GAGAL",
    //                     message: "No rekening Tidak Ditemukan",
    //                     rrn: rrn,
    //                     data: null
    //                 });

    //             }

    //         } else {
    //             console.log("Status Gagal ");
    //             console.log("No rekening Tidak Ditemukan");

    //             return res.status(200).send({
    //                 code: rek_tidakada,
    //                 status: "GAGAL",
    //                 message: "No rekening Tidak Ditemukan",
    //                 rrn: rrn,
    //                 data: null
    //             });
    //         }

    //     } catch (error) {
    //         console.log('Error Inquiry Account', error);
    //         return res.status(200).send({
    //             code: rek_tidakada,
    //             status: "GAGAL",
    //             message: "No rekening Tidak Ditemukan",
    //             rrn: rrn,
    //             data: null
    //         });
    //     }

});

module.exports = router;