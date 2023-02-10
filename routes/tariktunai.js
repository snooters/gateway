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
    rek_notauth,
    Req_Token_Tarik_Tunai,
    Release_Tarik_Tunai
} = process.env;

router.post('/', async (req, res) => {
    const schema = {
        no_hp: "string",
        bpr_id: "string",
        no_rek: "string",
        keterangan: "string",
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

    let { bpr_id, trx_code, trx_type, no_hp, no_rek, amount, trans_fee, tgl_trans, tgl_transmis, keterangan, rrn, data } = req.body;
    let { gl_rek_db_1, gl_jns_db_1, gl_amount_db_1, gl_rek_cr_1, gl_jns_cr_1, gl_amount_cr_1, gl_rek_db_2, gl_jns_db_2, gl_amount_db_2, gl_rek_cr_2,
        gl_jns_cr_2, gl_amount_cr_2 } = data

    if (trx_code == Req_Token_Tarik_Tunai) {
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
                ket = keterangan
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
                ket = keterangan
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

    } else if (trx_code == Release_Tarik_Tunai) {
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
                ket = keterangan
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
                ket = keterangan
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
});

module.exports = router;