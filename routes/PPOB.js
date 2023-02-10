require('dotenv').config();
var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const db = require("../connection/index");
const { getbalance } = require('../controllers/inqueryacct');
const { cekclosing } = require('../controllers/cek_status_closing');
const { getnotrn } = require('../controllers/getnotrn');
const { gettanggal } = require('../controllers/get_tgltrn');
const { gettrnke } = require('../controllers/gettrnketab');
const v = new Validator();

const {
    rek_tidakada,
    rek_tutup,
    saldo_kurang,
    rek_blokir,
    USER_ID,
    KODE_TRN_PPOB,
    BATCH,
    KODE_TRN_BUKU,
    PPOB,
    Sign_In,
    Sign_Off,
    Inquiry_Balance,
    invelid_transaction,
    Successful,
    rek_notauth
} = process.env;

router.post('/', async (req, res) => {
    const schema = {
        no_hp: "string",
        bpr_id: "string",
        no_rek: "string",
        product_name: "string",
        trx_code: "string",
        trx_type: "string",
        amount: "number",
        trans_fee: "number",
        tgl_trans: "string",
        tgl_transmis: "string",
        rrn: "string"
    }

    const validate = v.validate(req.body, schema);
    let request
    let gl_pok
    let gl_fee

    if (validate.length) {
        return res
            .status(200)
            .json(validate);
    }

    // let {no_hp,bpr_id,no_rek,product_name,token_mpin,trx_code,trx_type,amount,trans_fee,tgl_trans,tgl_transmis,rrn,data} = req.body;

    let { bpr_id, trx_code, trx_type, no_hp, no_rek, amount, trans_fee, tgl_trans, tgl_transmis, product_name, rrn, data } = req.body;
    let { gl_rek_db_1, gl_jns_db_1, gl_amount_db_1, gl_rek_cr_1, gl_jns_cr_1, gl_amount_cr_1, gl_rek_db_2, gl_jns_db_2, gl_amount_db_2, gl_rek_cr_2,
        gl_jns_cr_2, gl_amount_cr_2 } = data

    if (trx_code == PPOB) {
        if (trx_type == "TRX") {
            if (await cekclosing() == "C") {
                return res.status(200).send({
                    code: Sign_Off,
                    status: "GAGAL",
                    message: "Server Sedang Closing",
                    data: null
                })
            }

            let balance = await getbalance(gl_rek_db_1, gl_jns_db_1)
            let nama_rekdr = balance.nama
            let stsrec = balance.stsrec
            let stsblok = balance.stsblok
            let saldoakhir = balance.saldoakhir
            let saldoeff = balance.saldoeff
            let sbbtabdr = balance.sbbtab

            if (stsrec == "N") {
                return res.status(200).send({
                    code: rek_notauth,
                    status: "GAGAL",
                    message: "Rekening Belum Diautorisasi",
                    data: null
                })
            } else if (stsrec == "C") {
                return res.status(200).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Tutup",
                    data: null
                });
            } else if (stsrec == "T") {
                return res.status(200).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening tutup",
                    data: null
                })
            } else if (stsrec == "A") {

                if (stsblok == "R") {
                    return res.status(200).send({
                        code: rek_blokir,
                        status: "GAGAL",
                        message: "Rekening Diblokir",
                        data: null
                    })
                }

                if (saldoeff < (amount + trans_fee)) {
                    return res.status(200).send({
                        code: saldo_kurang,
                        status: "GAGAL",
                        message: "Saldo Tidak Cukup",
                        data: null
                    })
                }

                // proses POKOK Ke Rekening Nasabah
                try {
                    await db.sequelize.query(
                        "update m_tabunganc set saldoakhir= saldoakhir - ?, mutasidr= mutasidr + ?, trnke= trnke + 1 where noacc =?",
                        {
                            replacements: [amount, amount, gl_rek_db_1]
                        }
                    )
                } catch (e) {
                }

                try {
                    await db.sequelize.query(
                        "update m_tabunganc set saldoakhir= saldoakhir + ?, mutasicr= mutasicr + ?, trnke= trnke + 1 where noacc =?",
                        {
                            replacements: [amount, amount, gl_rek_cr_1]
                        }
                    )
                } catch (e) {
                }

                // insert transaksi
                tgltrn = await gettanggal()
                trnuser = USER_ID
                kodetrn = "2201"
                dracc = gl_rek_db_1
                drmodul = gl_jns_db_1
                cracc = gl_rek_cr_1
                crmodul = gl_jns_cr_1
                dc = ""
                nominal = amount
                tglval = tgltrn
                ket = product_name
                kdbank = gl_rek_db_1.substr(0, 3)
                kdcab = gl_rek_db_1.substr(3, 2)
                kdloc = gl_rek_db_1.substr(5, 2)
                ststrn = "5"
                inpuser = USER_ID
                jam = new Date()
                inptgljam = tgltrn + jam.getHours() + jam.getMinutes() + jam.getSeconds();
                inpterm = ""
                chguser = ""
                chgtgljam = ""
                chgterm = ""
                autuser = ""
                auttgljam = ""
                autterm = ""
                prog = "PPOB"
                groupno = 0
                modul = ""
                stscetak = "N"
                thnbln = tgltrn.substr(0, 6)
                jnstrnlx = ""
                jnstrntx = "03"
                stscetakcr = "N"
                kdaodr = ""
                kdaocr = ""
                kdkoldr = ""
                kdkolcr = ""
                kdtrnbuku = KODE_TRN_BUKU
                depfrom = ""
                depto = ""
                dokumen = rrn + tgltrn
                nama_tem = await getbalance(gl_rek_db_1, gl_jns_db_1)
                namadr = nama_tem.nama
                sbbperalihan_dr = gl_rek_db_1.substr(0, 3) + gl_rek_db_1.substr(3, 2) + gl_rek_db_1.substr(5, 2) + "10" + nama_tem.sbbtab
                trnke_dr = nama_tem.trnke
                nama_tem = await getbalance(gl_rek_cr_1, gl_jns_cr_1)
                namacr = nama_tem.nama
                sbbperalihan_cr = gl_rek_cr_1.substr(0, 3) + gl_rek_cr_1.substr(3, 2) + gl_rek_cr_1.substr(5, 2) + "10" + nama_tem.sbbtab
                trnke_cr = nama_tem.trnke
                notrn = await getnotrn(BATCH)


                let request
                let metadata
                [request, metadata] = await db.sequelize.query(
                    "INSERT INTO transaksi " +
                    "(tgltrn,           trnuser,            batch, " +
                    "notrn,             kodetrn,            dracc, " +
                    "drmodul,           cracc,              crmodul, " +
                    "dc,                dokumen,            nominal, " +
                    "tglval,            ket,                kodebpr, " +
                    "kodecab,           kodeloc,            ststrn, " +
                    "inpuser,           inptgljam,          inpterm, " +
                    "chguser,           chgtgljam,          chgterm, " +
                    "autuser,           auttgljam,          autterm, " +
                    "prog,              groupno,            modul,  " +
                    "sbbperalihan_dr,   sbbperalihan_cr,    stscetak, " +
                    "thnbln,            jnstrnlx,           jnstrntx, " +
                    "trnke_dr,          trnke_cr,           stscetakcr, " +
                    "kdaodr,            kdaocr,             kdkoldr, " +
                    "kdkolcr,           kdtrnbuku,          depfrom, " +
                    "depto,             namadr,             namacr)" +
                    "VALUES " +
                    "(?,                ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?," +
                    "?,                 ?,                  ?)",
                    {
                        replacements: [
                            tgltrn, trnuser, BATCH,
                            notrn, kodetrn, dracc,
                            drmodul, cracc, crmodul,
                            dc, dokumen, nominal,
                            tglval, ket, kdbank,
                            kdcab, kdloc, ststrn,
                            inpuser, inptgljam, inpterm,
                            chguser, chgtgljam, chgterm,
                            autuser, auttgljam, autterm,
                            prog, groupno, modul,
                            sbbperalihan_dr, sbbperalihan_cr, stscetak,
                            thnbln, jnstrnlx, jnstrntx,
                            trnke_dr, trnke_cr, stscetakcr,
                            kdaodr, kdaocr, kdkoldr,
                            kdkolcr, kdtrnbuku, depfrom,
                            depto, namadr, namacr]
                    }
                )

                try {
                    await db.sequelize.query(
                        "INSERT INTO transpc " +
                        "(tgltrn,           batch,          notrn, " +
                        "noacc,             dc,             nominal," +
                        "stscetak,          kdtrnbuku,      trnke)" +
                        "VALUES " +
                        "(?,                ?,              ?," +
                        "?,                 ?,              ?," +
                        "?,                 ?,              ?)",
                        {
                            replacements: [
                                tgltrn, BATCH, notrn,
                                gl_rek_db_1, "D", amount,
                                "N", KODE_TRN_BUKU, trnke_dr
                            ],
                        }
                    )
                } catch (e) {
                }

                try {
                    await db.sequelize.query(
                        "INSERT INTO transpc " +
                        "(tgltrn,           batch,          notrn, " +
                        "noacc,             dc,             nominal," +
                        "stscetak,          kdtrnbuku,      trnke)" +
                        "VALUES " +
                        "(?,                ?,              ?," +
                        "?,                 ?,              ?," +
                        "?,                 ?,              ?)",
                        {
                            replacements: [
                                tgltrn, BATCH, notrn,
                                gl_rek_cr_1, "C", amount,
                                "N", KODE_TRN_BUKU, trnke_cr
                            ]
                        }
                    )
                } catch (e) {
                }

                // transaksi FEE
                if (trans_fee > 0) {

                    try {
                        await db.sequelize.query(
                            "update m_tabunganc set saldoakhir= saldoakhir - ?, mutasidr= mutasidr + ?, trnke= trnke + 1 where noacc =?",
                            {
                                replacements: [trans_fee, trans_fee, gl_rek_db_2]
                            }
                        )
                    } catch (e) {
                    }

                    try {
                        await db.sequelize.query(
                            "update m_tabunganc set saldoakhir= saldoakhir + ?, mutasicr= mutasicr + ?, trnke= trnke + 1 where noacc =?",
                            {
                                replacements: [trans_fee, trans_fee, gl_rek_cr_2]
                            }
                        )
                    } catch (e) {
                    }

                    // insert transaksi
                    tgltrn = await gettanggal()
                    trnuser = USER_ID
                    kodetrn = "2201"
                    dracc = gl_rek_db_2
                    drmodul = gl_jns_db_2
                    cracc = gl_rek_cr_2
                    crmodul = gl_jns_cr_2
                    dc = ""
                    nominal = trans_fee
                    tglval = tgltrn
                    ket = product_name
                    kdbank = gl_rek_db_2.substr(0, 3)
                    kdcab = gl_rek_db_2.substr(3, 2)
                    kdloc = gl_rek_db_2.substr(5, 2)
                    ststrn = "5"
                    inpuser = USER_ID
                    jam = new Date()
                    inptgljam = tgltrn + jam.getHours() + jam.getMinutes() + jam.getSeconds();
                    inpterm = ""
                    chguser = ""
                    chgtgljam = ""
                    chgterm = ""
                    autuser = ""
                    auttgljam = ""
                    autterm = ""
                    prog = "PPOB"
                    groupno = 0
                    modul = ""
                    stscetak = "N"
                    thnbln = tgltrn.substr(0, 6)
                    jnstrnlx = ""
                    jnstrntx = "03"
                    stscetakcr = "N"
                    kdaodr = ""
                    kdaocr = ""
                    kdkoldr = ""
                    kdkolcr = ""
                    kdtrnbuku = KODE_TRN_BUKU
                    depfrom = ""
                    depto = ""
                    dokumen = rrn + tgltrn
                    nama_tem = await getbalance(gl_rek_db_2, gl_jns_db_2)
                    namadr = nama_tem.nama
                    sbbperalihan_dr = gl_rek_db_2.substr(0, 3) + gl_rek_db_2.substr(3, 2) + gl_rek_db_2.substr(5, 2) + "10" + nama_tem.sbbtab
                    trnke_dr = nama_tem.trnke
                    nama_tem = await getbalance(gl_rek_cr_2, gl_jns_cr_2)
                    namacr = nama_tem.nama
                    sbbperalihan_cr = gl_rek_cr_2.substr(0, 3) + gl_rek_cr_2.substr(3, 2) + gl_rek_cr_2.substr(5, 2) + "10" + nama_tem.sbbtab
                    trnke_cr = nama_tem.trnke
                    notrn = await getnotrn(BATCH)

                    try {
                        await db.sequelize.query(
                            "INSERT INTO transaksi " +
                            "(tgltrn,           trnuser,            batch, " +
                            "notrn,             kodetrn,            dracc, " +
                            "drmodul,           cracc,              crmodul, " +
                            "dc,                dokumen,            nominal, " +
                            "tglval,            ket,                kodebpr, " +
                            "kodecab,           kodeloc,            ststrn, " +
                            "inpuser,           inptgljam,          inpterm, " +
                            "chguser,           chgtgljam,          chgterm, " +
                            "autuser,           auttgljam,          autterm, " +
                            "prog,              groupno,            modul,  " +
                            "sbbperalihan_dr,   sbbperalihan_cr,    stscetak, " +
                            "thnbln,            jnstrnlx,           jnstrntx, " +
                            "trnke_dr,          trnke_cr,           stscetakcr, " +
                            "kdaodr,            kdaocr,             kdkoldr, " +
                            "kdkolcr,           kdtrnbuku,          depfrom, " +
                            "depto,             namadr,             namacr)" +
                            "VALUES " +
                            "(?,                ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?)",
                            {
                                replacements: [
                                    tgltrn, trnuser, BATCH,
                                    notrn, kodetrn, dracc,
                                    drmodul, cracc, crmodul,
                                    dc, dokumen, nominal,
                                    tglval, ket, kdbank,
                                    kdcab, kdloc, ststrn,
                                    inpuser, inptgljam, inpterm,
                                    chguser, chgtgljam, chgterm,
                                    autuser, auttgljam, autterm,
                                    prog, groupno, modul,
                                    sbbperalihan_dr, sbbperalihan_cr, stscetak,
                                    thnbln, jnstrnlx, jnstrntx,
                                    trnke_dr, trnke_cr, stscetakcr,
                                    kdaodr, kdaocr, kdkoldr,
                                    kdkolcr, kdtrnbuku, depfrom,
                                    depto, namadr, namacr
                                ]
                            }
                        )

                    } catch (e) {
                    }

                    try {
                        await db.sequelize.query(
                            "INSERT INTO transpc " +
                            "(tgltrn,           batch,          notrn, " +
                            "noacc,             dc,             nominal," +
                            "stscetak,          kdtrnbuku,      trnke)" +
                            "VALUES " +
                            "(?,                ?,              ?," +
                            "?,                 ?,              ?," +
                            "?,                 ?,              ?)",
                            {
                                replacements: [
                                    tgltrn, BATCH, notrn,
                                    gl_rek_db_2, "D", trans_fee,
                                    "N", KODE_TRN_BUKU, trnke_dr
                                ]
                            }
                        )
                    } catch (e) {
                    }

                    try {
                        await db.sequelize.query(
                            "INSERT INTO transpc " +
                            "(tgltrn,           batch,          notrn, " +
                            "noacc,             dc,             nominal," +
                            "stscetak,          kdtrnbuku,      trnke)" +
                            "VALUES " +
                            "(?,                ?,              ?," +
                            "?,                 ?,              ?," +
                            "?,                 ?,              ?)",
                            {
                                replacements: [
                                    tgltrn, BATCH, notrn,
                                    gl_rek_cr_2, "C", trans_fee,
                                    "N", KODE_TRN_BUKU, trnke_cr
                                ]
                            }
                        )
                    } catch (e) {
                    }
                }

                return res.status(200).send({
                    code: "000",
                    status: "SUKSES",
                    message: "SUKSES",
                    rrn: rrn,
                    data: {
                        bpr_id: bpr_id,
                        trx_code: trx_code,
                        trx_type: trx_type,
                        no_hp: no_hp,
                        No_rek: no_rek,
                        Nama: nama_rekdr,
                        amount: amount,
                        trans_fee: trans_fee,
                        tgl_trans: tgl_trans,
                        tgl_transmis: tgl_transmis,
                        noreff: rrn + tgltrn
                    }
                })


            } else {
                return res.status(200).send({
                    code: rek_tidakada,
                    status: "GAGAL",
                    message: "Rekening Tidak Ada",
                    data: null
                })
            }





        } else if (trx_type = "REV") {


            if (await cekclosing() == "C") {
                return res.status(200).send({
                    code: Sign_Off,
                    status: "GAGAL",
                    message: "Server Sedang Closing",
                    data: null
                })
            }

            let balance = await getbalance(gl_rek_db_1, gl_jns_db_1)
            let nama_rekdr = balance.nama
            let stsrec = balance.stsrec
            let stsblok = balance.stsblok
            let saldoakhir = balance.saldoakhir
            let saldoeff = balance.saldoeff
            let sbbtabdr = balance.sbbtab

            if (stsrec == "N") {
                return res.status(200).send({
                    code: rek_notauth,
                    status: "GAGAL",
                    message: "Rekening Belum Diautorisasi",
                    data: null
                })
            } else if (stsrec == "C") {
                return res.status(200).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Tutup",
                    data: null
                });
            } else if (stsrec == "T") {
                return res.status(200).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening tutup",
                    data: null
                })
            } else if (stsrec == "A") {

                if (stsblok == "R") {
                    return res.status(200).send({
                        code: rek_blokir,
                        status: "GAGAL",
                        message: "Rekening Diblokir",
                        data: null
                    })
                }

                if (saldoeff < (amount + trans_fee)) {
                    return res.status(200).send({
                        code: saldo_kurang,
                        status: "GAGAL",
                        message: "Saldo Tidak Cukup",
                        data: null
                    })
                }

                // proses POKOK Ke Rekening Nasabah
                try {
                    await db.sequelize.query(
                        "update m_tabunganc set saldoakhir= saldoakhir + ?, mutasicr= mutasicr + ?, trnke= trnke + 1 where noacc =?",
                        {
                            replacements: [amount, amount, gl_rek_db_1]
                        }
                    )
                } catch (e) {
                }

                try {
                    await db.sequelize.query(
                        "update m_tabunganc set saldoakhir= saldoakhir - ?, mutasidr= mutasidr + ?, trnke= trnke + 1 where noacc =?",
                        {
                            replacements: [amount, amount, gl_rek_cr_1]
                        }
                    )
                } catch (e) {
                }

                // insert transaksi
                tgltrn = await gettanggal()
                trnuser = USER_ID
                kodetrn = "2201"
                dracc = gl_rek_cr_1
                drmodul = gl_jns_cr_1
                cracc = gl_rek_db_1
                crmodul = gl_jns_db_1
                dc = ""
                nominal = amount
                tglval = tgltrn
                ket = product_name
                kdbank = gl_rek_db_1.substr(0, 3)
                kdcab = gl_rek_db_1.substr(3, 2)
                kdloc = gl_rek_db_1.substr(5, 2)
                ststrn = "5"
                inpuser = USER_ID
                jam = new Date()
                inptgljam = tgltrn + jam.getHours() + jam.getMinutes() + jam.getSeconds();
                inpterm = ""
                chguser = ""
                chgtgljam = ""
                chgterm = ""
                autuser = ""
                auttgljam = ""
                autterm = ""
                prog = "PPOB"
                groupno = 0
                modul = ""
                stscetak = "N"
                thnbln = tgltrn.substr(0, 6)
                jnstrnlx = ""
                jnstrntx = "03"
                stscetakcr = "N"
                kdaodr = ""
                kdaocr = ""
                kdkoldr = ""
                kdkolcr = ""
                kdtrnbuku = KODE_TRN_BUKU
                depfrom = ""
                depto = ""
                dokumen = rrn + tgltrn
                nama_tem = await getbalance(gl_rek_cr_1, gl_jns_cr_1)
                namadr = nama_tem.nama
                sbbperalihan_dr = gl_rek_cr_1.substr(0, 3) + gl_rek_cr_1.substr(3, 2) + gl_rek_cr_1.substr(5, 2) + "10" + nama_tem.sbbtab
                trnke_dr = nama_tem.trnke
                nama_tem = await getbalance(gl_rek_db_1, gl_jns_db_1)
                namacr = nama_tem.nama
                sbbperalihan_cr = gl_rek_db_1.substr(0, 3) + gl_rek_db_1.substr(3, 2) + gl_rek_db_1.substr(5, 2) + "10" + nama_tem.sbbtab
                trnke_cr = nama_tem.trnke
                notrn = await getnotrn(BATCH)

                try {
                    await db.sequelize.query(
                        "INSERT INTO transaksi " +
                        "(tgltrn,           trnuser,            batch, " +
                        "notrn,             kodetrn,            dracc, " +
                        "drmodul,           cracc,              crmodul, " +
                        "dc,                dokumen,            nominal, " +
                        "tglval,            ket,                kodebpr, " +
                        "kodecab,           kodeloc,            ststrn, " +
                        "inpuser,           inptgljam,          inpterm, " +
                        "chguser,           chgtgljam,          chgterm, " +
                        "autuser,           auttgljam,          autterm, " +
                        "prog,              groupno,            modul,  " +
                        "sbbperalihan_dr,   sbbperalihan_cr,    stscetak, " +
                        "thnbln,            jnstrnlx,           jnstrntx, " +
                        "trnke_dr,          trnke_cr,           stscetakcr, " +
                        "kdaodr,            kdaocr,             kdkoldr, " +
                        "kdkolcr,           kdtrnbuku,          depfrom, " +
                        "depto,             namadr,             namacr)" +
                        "VALUES " +
                        "(?,                ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?," +
                        "?,                 ?,                  ?)",
                        {
                            replacements: [
                                tgltrn, trnuser, BATCH,
                                notrn, kodetrn, dracc,
                                drmodul, cracc, crmodul,
                                dc, dokumen, nominal,
                                tglval, ket, kdbank,
                                kdcab, kdloc, ststrn,
                                inpuser, inptgljam, inpterm,
                                chguser, chgtgljam, chgterm,
                                autuser, auttgljam, autterm,
                                prog, groupno, modul,
                                sbbperalihan_dr, sbbperalihan_cr, stscetak,
                                thnbln, jnstrnlx, jnstrntx,
                                trnke_dr, trnke_cr, stscetakcr,
                                kdaodr, kdaocr, kdkoldr,
                                kdkolcr, kdtrnbuku, depfrom,
                                depto, namadr, namacr
                            ]
                        }
                    )

                } catch (e) {
                }

                try {
                    await db.sequelize.query(
                        "INSERT INTO transpc " +
                        "(tgltrn,           batch,          notrn, " +
                        "noacc,             dc,             nominal," +
                        "stscetak,          kdtrnbuku,      trnke)" +
                        "VALUES " +
                        "(?,                ?,              ?," +
                        "?,                 ?,              ?," +
                        "?,                 ?,              ?)",
                        {
                            replacements: [
                                tgltrn, BATCH, notrn,
                                gl_rek_db_1, "C", amount,
                                "N", KODE_TRN_BUKU, trnke_dr
                            ]
                        }
                    )
                } catch (e) {
                }

                try {
                    await db.sequelize.query(
                        "INSERT INTO transpc " +
                        "(tgltrn,           batch,          notrn, " +
                        "noacc,             dc,             nominal," +
                        "stscetak,          kdtrnbuku,      trnke)" +
                        "VALUES " +
                        "(?,                ?,              ?," +
                        "?,                 ?,              ?," +
                        "?,                 ?,              ?)",
                        {
                            replacements: [
                                tgltrn, BATCH, notrn,
                                gl_rek_cr_1, "D", amount,
                                "N", KODE_TRN_BUKU, trnke_cr
                            ]
                        }
                    )
                } catch (e) {
                }

                // transaksi FEE
                if (trans_fee > 0) {
                    try {
                        await db.sequelize.query(
                            "update m_tabunganc set saldoakhir= saldoakhir + ?, mutasicr= mutasicr + ?, trnke= trnke + 1 where noacc =?",
                            {
                                replacements: [trans_fee, trans_fee, gl_rek_db_2]
                            }
                        )
                    } catch (e) {
                    }

                    try {
                        await db.sequelize.query(
                            "update m_tabunganc set saldoakhir= saldoakhir - ?, mutasidr= mutasidr + ?, trnke= trnke + 1 where noacc =?",
                            {
                                replacements: [trans_fee, trans_fee, gl_rek_cr_2]
                            }
                        )
                    } catch (e) {
                    }

                    // insert transaksi
                    tgltrn = await gettanggal()
                    trnuser = USER_ID
                    kodetrn = "2201"
                    dracc = gl_rek_cr_2
                    drmodul = gl_jns_cr_2
                    cracc = gl_rek_db_2
                    crmodul = gl_jns_db_2
                    dc = ""
                    nominal = trans_fee
                    tglval = tgltrn
                    ket = product_name
                    kdbank = gl_rek_cr_2.substr(0, 3)
                    kdcab = gl_rek_cr_2.substr(3, 2)
                    kdloc = gl_rek_cr_2.substr(5, 2)
                    ststrn = "5"
                    inpuser = USER_ID
                    jam = new Date()
                    inptgljam = tgltrn + jam.getHours() + jam.getMinutes() + jam.getSeconds();
                    inpterm = ""
                    chguser = ""
                    chgtgljam = ""
                    chgterm = ""
                    autuser = ""
                    auttgljam = ""
                    autterm = ""
                    prog = "PPOB"
                    groupno = 0
                    modul = ""
                    stscetak = "N"
                    thnbln = tgltrn.substr(0, 6)
                    jnstrnlx = ""
                    jnstrntx = "03"
                    stscetakcr = "N"
                    kdaodr = ""
                    kdaocr = ""
                    kdkoldr = ""
                    kdkolcr = ""
                    kdtrnbuku = KODE_TRN_BUKU
                    depfrom = ""
                    depto = ""
                    dokumen = rrn + tgltrn
                    nama_tem = await getbalance(gl_rek_cr_2, gl_jns_cr_2)
                    namadr = nama_tem.nama
                    sbbperalihan_dr = gl_rek_cr_2.substr(0, 3) + gl_rek_cr_2.substr(3, 2) + gl_rek_cr_2.substr(5, 2) + "10" + nama_tem.sbbtab
                    trnke_dr = nama_tem.trnke
                    nama_tem = await getbalance(gl_rek_db_2, gl_jns_db_2)
                    namacr = nama_tem.nama
                    sbbperalihan_cr = gl_rek_db_2.substr(0, 3) + gl_rek_db_2.substr(3, 2) + gl_rek_db_2.substr(5, 2) + "10" + nama_tem.sbbtab
                    trnke_cr = nama_tem.trnke
                    notrn = await getnotrn(BATCH)

                    try {
                        await db.sequelize.query(
                            "INSERT INTO transaksi " +
                            "(tgltrn,           trnuser,            batch, " +
                            "notrn,             kodetrn,            dracc, " +
                            "drmodul,           cracc,              crmodul, " +
                            "dc,                dokumen,            nominal, " +
                            "tglval,            ket,                kodebpr, " +
                            "kodecab,           kodeloc,            ststrn, " +
                            "inpuser,           inptgljam,          inpterm, " +
                            "chguser,           chgtgljam,          chgterm, " +
                            "autuser,           auttgljam,          autterm, " +
                            "prog,              groupno,            modul,  " +
                            "sbbperalihan_dr,   sbbperalihan_cr,    stscetak, " +
                            "thnbln,            jnstrnlx,           jnstrntx, " +
                            "trnke_dr,          trnke_cr,           stscetakcr, " +
                            "kdaodr,            kdaocr,             kdkoldr, " +
                            "kdkolcr,           kdtrnbuku,          depfrom, " +
                            "depto,             namadr,             namacr)" +
                            "VALUES " +
                            "(?,                ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?," +
                            "?,                 ?,                  ?)",
                            {
                                replacements: [
                                    tgltrn, trnuser, BATCH,
                                    notrn, kodetrn, dracc,
                                    drmodul, cracc, crmodul,
                                    dc, dokumen, nominal,
                                    tglval, ket, kdbank,
                                    kdcab, kdloc, ststrn,
                                    inpuser, inptgljam, inpterm,
                                    chguser, chgtgljam, chgterm,
                                    autuser, auttgljam, autterm,
                                    prog, groupno, modul,
                                    sbbperalihan_dr, sbbperalihan_cr, stscetak,
                                    thnbln, jnstrnlx, jnstrntx,
                                    trnke_dr, trnke_cr, stscetakcr,
                                    kdaodr, kdaocr, kdkoldr,
                                    kdkolcr, kdtrnbuku, depfrom,
                                    depto, namadr, namacr
                                ]
                            }
                        )

                    } catch (e) {
                    }

                    try {
                        await db.sequelize.query(
                            "INSERT INTO transpc " +
                            "(tgltrn,           batch,          notrn, " +
                            "noacc,             dc,             nominal," +
                            "stscetak,          kdtrnbuku,      trnke)" +
                            "VALUES " +
                            "(?,                ?,              ?," +
                            "?,                 ?,              ?," +
                            "?,                 ?,              ?)",
                            {
                                replacements: [
                                    tgltrn, BATCH, notrn,
                                    gl_rek_db_2, "C", trans_fee,
                                    "N", KODE_TRN_BUKU, trnke_dr
                                ]
                            }
                        )
                    } catch (e) {
                    }

                    try {
                        await db.sequelize.query(
                            "INSERT INTO transpc " +
                            "(tgltrn,           batch,          notrn, " +
                            "noacc,             dc,             nominal," +
                            "stscetak,          kdtrnbuku,      trnke)" +
                            "VALUES " +
                            "(?,                ?,              ?," +
                            "?,                 ?,              ?," +
                            "?,                 ?,              ?)",
                            {
                                replacements: [
                                    tgltrn, BATCH, notrn,
                                    gl_rek_cr_2, "D", trans_fee,
                                    "N", KODE_TRN_BUKU, trnke_cr
                                ]
                            }
                        )
                    } catch (e) {
                    }
                }

                return res.status(200).send({
                    code: "000",
                    status: "SUKSES",
                    message: "SUKSES",
                    rrn: rrn,
                    data: {
                        bpr_id: bpr_id,
                        trx_code: trx_code,
                        trx_type: trx_type,
                        no_hp: no_hp,
                        No_rek: no_rek,
                        Nama: nama_rekdr,
                        amount: amount,
                        trans_fee: trans_fee,
                        tgl_trans: tgl_trans,
                        tgl_transmis: tgl_transmis,
                        noreff: rrn + tgltrn
                    }
                })


            } else {
                return res.status(200).send({
                    code: rek_tidakada,
                    status: "GAGAL",
                    message: "Rekening Tidak Ada",
                    data: null
                })
            }








        } else {
            res.status(200).send({
                code: invelid_transaction,
                status: "GAGAL",
                message: "TRX_TYPE Salah",
                data: null
            })
        }

    } else {
        // jika trx code tidak terdaftar
        res.status(200).send({
            code: invelid_transaction,
            status: "GAGAL",
            message: "TRX CODE " + trx_code + " TIDAK TERDAFTAR",
            data: null
        })
    }













    //     // let { no_rek, trx_code, rek_pok, rek_fee, nominal_pok, nominal_fee, terminal_id, rrn, keterangan } = req.body;

    //    rek_pok = data.gl_rek_cr_1;
    //    rek_fee = data.gl_rek_cr_2;
    //    nominal_pok = data.gl_amount_cr_1;
    //    nominal_fee = data.gl_amount_cr_2;
    //    terminal_id =""
    //    keterangan =product_name ;
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
    //     }

    //     try {
    //         // cari data tabungan nasabah
    //         request = await db.sequelize.query(
    //             "select noacc,stsblok,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke + 1 as trnke from m_tabunganc  where noacc =?",
    //             {
    //                 replacements: [no_rek],
    //                 type: db.sequelize.QueryTypes.SELECT,
    //             }
    //         )

    //         // validasi status rekening
    //         if (request[0]["stsrec"] == null) {
    //             return res.status(200).send({
    //                 code: rek_tidakada,
    //                 status: "GAGAL",
    //                 message: "Rekening Tidak Ditemukan",
    //                 rrn: rrn,
    //                 data: null
    //             });
    //         } else if (request[0]["stsrec"] == "N") {
    //             return res.status(200).send({
    //                 code: rek_notauth,
    //                 status: "GAGAL",
    //                 message: "Rekening Tidak Aktif",
    //                 rrn: rrn,
    //                 data: null
    //             });
    //         } else if (request[0]["stsrec"] == "T") {
    //             return res.status(200).send({
    //                 code: rek_tutup,
    //                 status: "GAGAL",
    //                 message: "Rekening Tutup",
    //                 rrn: rrn,
    //                 data: null
    //             });
    //         } else if (request[0]["stsrec"] == "C") {
    //             return res.status(200).send({
    //                 code: rek_tutup,
    //                 status: "GAGAL",
    //                 message: "Rekening Tutup",
    //                 rrn: rrn,
    //                 data: null
    //             });
    //         } else if (request[0]["stsrec"] == "D") {
    //             return res.status(200).send({
    //                 code: rek_notauth,
    //                 status: "GAGAL",
    //                 message: "Rekening Dihapus",
    //                 rrn: rrn,
    //                 data: null
    //             });
    //         } else if (request[0]["stsrec"] == "A") {

    //               // cek status blokir
    //               if(request[0]["stsblok"] == "R"){
    //                 return res.status(200).send({
    //                     code: rek_blokir,
    //                     status: "GAGAL",
    //                     message: "Rekening Diblokir",
    //                     rrn:rrn,
    //                     data: null
    //                 });
    //                };

    //             if (request[0]["saldoeff"] < nominal_pok + nominal_fee) {
    //                 return res.status(200).send({
    //                     code: saldo_kurang,
    //                     status: "GAGAL",
    //                     message: "Saldo Tabungan Tidak Cukup",
    //                     rrn: rrn,
    //                     data: null
    //                 });
    //             }
    //             // cek kode transaksi
    //             // cari rekpok POKOK OY
    //             if (trx_code == PPOB) {
    //                 gl_pok = await db.sequelize.query(
    //                     "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke + 1 as trnke from m_tabunganc  where noacc =?",
    //                     {
    //                         replacements: [rek_pok],
    //                         type: db.sequelize.QueryTypes.SELECT,
    //                     }
    //                 )

    //                 if (!gl_pok.length) {
    //                     return res.status(200).send({
    //                         code: rek_tidakada,
    //                         status: "GAGAL",
    //                         message: "Rekening Pok Tidak Ditemukan",
    //                         rrn: rrn,
    //                         data: null

    //                     });
    //                 };

    //                 // cari GL fee OY
    //                 gl_fee = await db.sequelize.query(
    //                     "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke + 1 as trnke from m_tabunganc  where noacc =?",
    //                     {
    //                         replacements: [rek_fee],
    //                         type: db.sequelize.QueryTypes.SELECT,
    //                     }
    //                 )

    //                 if (!gl_fee.length) {
    //                     return res.status(200).send({
    //                         code: rek_tidakada,
    //                         status: "GAGAL",
    //                         message: "Rekening Fee Tidak Ditemukan",
    //                         rrn: rrn,
    //                         data: null
    //                     });
    //                 }

    //                 let result

    //                 //PROSES update tabungan nasabah PPOB
    //                 [result, metadata] = await db.sequelize.query(
    //                     "update m_tabunganc set saldoakhir= saldoakhir - ?, trnke = trnke + 1,mutasidr =  mutasidr + ? where noacc=?",
    //                     {
    //                         replacements: [nominal_pok,nominal_pok, no_rek],
    //                     }
    //                 );

    //                 if (!metadata) {
    //                     return res.status(200).send({
    //                         code: invelid_transaction,
    //                         status: "GAGAL",
    //                         message: "Gagal Mengurangi Saldo Tabungan",
    //                         rrn: rrn,
    //                         data: null
    //                     });
    //                 };

    //                 // proses update tabungan rek pok OY

    //                 [result, metadata] = await db.sequelize.query(
    //                     "update m_tabunganc set saldoakhir= saldoakhir + ?, trnke = trnke + 1,mutasicr =  mutasicr + ? where noacc=?",
    //                     {
    //                         replacements: [nominal_pok,nominal_pok, rek_pok],
    //                     }
    //                 );

    //                 if (!metadata) {
    //                     return res.status(200).send({
    //                         code: invelid_transaction,
    //                         status: "GAGAL",
    //                         message: "Gagal Menambah Saldo Tabungan Pok",
    //                         rrn: rrn,
    //                         data: null
    //                     });
    //                 };


    //                 // get tanggal transaksi
    //                 let tanggal = await db.sequelize.query(
    //                     "select right(tgl,4) as thn , SUBSTRING(tgl,3,2) as bln, LEFT(tgl,2)as tgl from tanggal",
    //                     {
    //                         type: db.sequelize.QueryTypes.SELECT,
    //                     }
    //                 );

    //                 let tgltrn = tanggal[0]["thn"] + tanggal[0]["bln"] + tanggal[0]["tgl"];

    //                 // get nomor transaksi
    //                 let notransaksi = await db.sequelize.query(
    //                     "select nomor + 10 as notrn from nomaster where batch=?",
    //                     {
    //                         replacements: [parseFloat(BATCH)],
    //                         type: db.sequelize.QueryTypes.SELECT,
    //                     }
    //                 );

    //                 let notrn = notransaksi[0]["notrn"];
    //                 let kdbank = no_rek.substr(0, 3);
    //                 let kdcab = no_rek.substr(3, 2);
    //                 let kdloc = no_rek.substr(5, 2);
    //                 let sbbperalihan_dr = kdbank + kdcab + kdloc + "10" + request[0]["sbbtab"];
    //                 let sbbperalihan_cr = rek_pok.substr(0, 3) + rek_pok.substr(3, 2) + rek_pok.substr(5, 2) + "10" + gl_pok[0]["sbbtab"];
    //                 let trnke = request[0]["trnke"]; 
    //                 noreff = BATCH + notrn 

    //                 // update nomor transaksi
    //                 await db.sequelize.query(
    //                     "update nomaster set nomor = ? where batch= ?",
    //                     {
    //                         replacements: [notrn, parseFloat(BATCH)]
    //                     }
    //                 );

    //                 let jam = new Date()
    //                 let tgljam = tgltrn + jam.getHours() + jam.getMinutes() + jam.getSeconds();

    //                 // proses transaksi PPOB REKENING POkOK
    //                 

    //                 // insert transpc nasabah POK
    //                 [result, metadata] = await db.sequelize.query(
    //                     "insert into transpc (" +
    //                     "tgltrn,    batch,  notrn,  noacc,  dc, nominal,    stscetak,   kdtrnbuku,  trnke)" +
    //                     "values (" +
    //                     "?,         ?,      ?,      ?,      ?,  ?,          ?,          ?,          ?)",
    //                     {
    //                         replacements: [tgltrn, BATCH, notrn, no_rek, "D", nominal_pok, "N", KODE_TRN_BUKU, trnke]
    //                     }
    //                 );
    //                 // get trn ke rek pok OY
    //                 let trnkepok = await db.sequelize.query(
    //                     "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke  from m_tabunganc  where noacc =?",
    //                     {
    //                         replacements: [rek_pok],
    //                         type: db.sequelize.QueryTypes.SELECT,
    //                     }
    //                 )
    //                 let tanspcpokke = trnkepok[0]["trnke"];

    //                 // insert transpc rek pok
    //                 [result, metadata] = await db.sequelize.query(
    //                     "insert into transpc (" +
    //                     "tgltrn,    batch,  notrn,  noacc,  dc, nominal,    stscetak,   kdtrnbuku,  trnke)" +
    //                     "values (" +
    //                     "?,         ?,      ?,      ?,      ?,  ?,          ?,          ?,          ?)",
    //                     {
    //                         replacements: [tgltrn, BATCH, notrn, rek_pok, "C", nominal_pok, "N", KODE_TRN_BUKU, tanspcpokke]
    //                     }
    //                 );

    //                 // update transaksi fee ke di tabungan nasabah
    //                 await db.sequelize.query(
    //                     "update m_tabunganc set saldoakhir = saldoakhir - ?, trnke = trnke +1,mutasidr =  mutasidr - ? where noacc=?",
    //                     {
    //                         replacements: [nominal_fee,nominal_fee, no_rek]
    //                     }
    //                 );

    //                 // update transaksi fee ke di tabungan OY
    //                 await db.sequelize.query(
    //                     "update m_tabunganc set saldoakhir = saldoakhir + ?, trnke = trnke + 1, mutasicr =  mutasicr + ? where noacc= ?",
    //                     {
    //                         replacements: [nominal_fee, nominal_fee, rek_fee]
    //                     }
    //                 );

    //                 let trnkefee = await db.sequelize.query(
    //                     "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke  from m_tabunganc  where noacc =?",
    //                     {
    //                         replacements: [rek_fee],
    //                         type: db.sequelize.QueryTypes.SELECT,
    //                     }
    //                 )
    //                 let tanspcfeeke = trnkepok[0]["trnke"];

    //                 // get nomor transaksi
    //                 notransaksi = await db.sequelize.query(
    //                     "select nomor+10 as notrn from nomaster where batch=?",
    //                     {
    //                         replacements: [parseFloat(BATCH)],
    //                         type: db.sequelize.QueryTypes.SELECT,
    //                     }
    //                 );

    //                 // proses transaksi PPOB FEE

    //                 notrn = notransaksi[0]["notrn"];
    //                 sbbperalihan_cr = kdbank + kdcab + kdloc + "10" + trnkefee[0]["sbbtab"];
    //                 trnke = tanspcfeeke;
    //                 noreff = noreff + notrn + rrn
    //                 // update nomor transaksi
    //                 await db.sequelize.query(
    //                     "update nomaster set nomor = ? where batch=?",
    //                     {
    //                         replacements: [notrn, parseFloat(BATCH)]
    //                     }
    //                 );

    //                 [result, metadata] = await db.sequelize.query(
    //                     "insert into transaksi (" +
    //                     "tgltrn,            trnuser,            batch,              notrn,              kodetrn," +
    //                     "dracc,             drmodul,            cracc,              crmodul,            dc," +
    //                     "dokumen,           nominal,            tglval,             ket,                kodebpr," +
    //                     "kodecab,           kodeloc,            ststrn,             inpuser,            inptgljam," +
    //                     "inpterm,           chguser,            chgtgljam,          chgterm,            autuser," +
    //                     "auttgljam,         autterm,            prog,               groupno,            modul," +
    //                     "sbbperalihan_dr,   sbbperalihan_cr,    stscetak,           thnbln,             jnstrnlx," +
    //                     "jnstrntx,          trnke_dr,           trnke_cr,           stscetakcr,         kdaodr," +
    //                     "kdaocr,            kdkoldr,            kdkolcr,            kdtrnbuku,          depfrom," +
    //                     "depto,             namadr,             namacr               ) " +
    //                     "values(" +
    //                     "?,                 ?,                  ?,                  ?,                  ?," +
    //                     "?,                 ?,                  ?,                  ?,                  ?," +
    //                     "?,                 ?,                  ?,                  ?,                  ?," +
    //                     "?,                 ?,                  ?,                  ?,                  ?," +
    //                     "?,                 ?,                  ?,                  ?,                  ?," +
    //                     "?,                 ?,                  ?,                  ?,                  ?," +
    //                     "?,                 ?,                  ?,                  ?,                  ?," +
    //                     "?,                 ?,                  ?,                  ?,                  ?," +
    //                     "?,                 ?,                  ?,                  ?,                  ?," +
    //                     "?,                 ?,                  ?                   )",
    //                     {
    //                         replacements: [
    //                     tgltrn,             USER_ID,            BATCH,              notrn,              KODE_TRN_PPOB,
    //                     no_rek,             '2',                rek_fee,            '2',                "",
    //                     rrn,                nominal_fee,        tgltrn,             "FEE " + keterangan,kdbank,
    //                     kdcab,              kdloc,              "5",                USER_ID,            tgljam,
    //                     terminal_id,        "",                 "",                 "",                 "", 
    //                     "",                 "",                 "ppob",             0,                  "", 
    //                     sbbperalihan_dr,    sbbperalihan_cr,    "N",                tanggal[0]["thn"] + tanggal[0]["bln"], "",
    //                     "03",               trnke,              0,                  "N",                "",
    //                     "",                 "",                 "",                 KODE_TRN_BUKU,      "000",
    //                     "",                 request[0]["fnama"], gl_fee[0]["fnama"]]
    //                     }

    //                 );
    //                 let trnkedeb1 = await db.sequelize.query(
    //                     "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke  from m_tabunganc  where noacc =?",
    //                     {
    //                         replacements: [no_rek],
    //                         type: db.sequelize.QueryTypes.SELECT,
    //                     }
    //                 )
    //                 let trnkedeb = trnkedeb1[0]["trnke"];

    //                 // insert transpc fee nasabah
    //                 [result, metadata] = await db.sequelize.query(
    //                     "insert into transpc (" +
    //                     "tgltrn,    batch,  notrn,  noacc,  dc, nominal,    stscetak,   kdtrnbuku,  trnke)" +
    //                     "values (" +
    //                     "?,         ?,      ?,      ?,      ?,  ?,          ?,          ?,          ?)",
    //                     {
    //                         replacements: [tgltrn, BATCH, notrn, no_rek, "D", nominal_fee, "N", KODE_TRN_BUKU, trnkedeb]
    //                     }
    //                 );

    //                 // insert transpc fee OY
    //                 [result, metadata] = await db.sequelize.query(
    //                     "insert into transpc (" +
    //                     "tgltrn,    batch,  notrn,  noacc,  dc, nominal,    stscetak,   kdtrnbuku,  trnke)" +
    //                     "values (" +
    //                     "?,         ?,      ?,      ?,      ?,  ?,          ?,          ?,          ?)",
    //                     {
    //                         replacements: [tgltrn, BATCH, notrn, rek_fee, "C", nominal_fee, "N", KODE_TRN_BUKU, tanspcfeeke]
    //                     }
    //                 );


    //                 return res.status(200).send({
    //                     code: Successful,
    //                     status: "SUKSES",
    //                     message: "Transaksi PPOB :" + keterangan + "SUKSES",
    //                     rrn: rrn,
    //                     data: {
    //                         bpr_id: bpr_id,
    //                         trx_code: trx_code,
    //                         trx_type: trx_type,
    //                         no_hp: no_hp,
    //                         No_rek: no_rek,
    //                         Nama_rek: request[0]["fnama"],   
    //                         amount:amount,
    //                         trans_fee:trans_fee,
    //                         tgl_trans: tgl_trans,
    //                         tgl_transmis: tgl_transmis,
    //                         noreff: noreff,                    
    //                     }
    //                 });

    //             } else {
    //                 return res.status(200).send({
    //                     code: rek_tidakada,
    //                     status: "GAGAL",
    //                     message: "Rekening Tidak Ditemukan",
    //                     rrn: rrn,
    //                     data: null
    //                 });
    //             }

    //         } else {
    //             // jika rekening tidak ditemukan 
    //             return res.status(200).send({
    //                 code: invelid_transaction,
    //                 status: "GAGAL",
    //                 message: "Kode Transaksi Tidak ditemukan",
    //                 rrn: rrn,
    //                 data: null
    //             });
    //         }
    //     } catch (error) {
    //         console.log('Error Inquiry Account PPOB', error);
    //         return res.status(200).send({
    //             code: rek_tidakada,
    //             status: "GAGAL",
    //             message: "Rekening Tidak Ditemukan ",
    //             rrn: rrn,
    //             data: null
    //         });
    //     }

});

module.exports = router;