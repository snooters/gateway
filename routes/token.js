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
    KODE_TRN_PPOB,
    BATCH,
    KODE_TRN_BUKU,
    PPOB,
    Sign_In,
    Sign_Off,
    invelid_transaction,
    Successful,
    Req_Token_Tarik_Tunai,
    Release_Tarik_Tunai
} = process.env;

router.post('/', async (req, res) => {
    const schema = {
        no_hp: "string",
        bpr_id: "string",
        no_rek: "string",
        trx_code: "string",
        trx_type: "string",
        amount: "number",
        trans_fee: "number",
        token: "string",
        keterangan: "string",
        terminal_id: "string",
        lokasi: "string",
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
            .status(400)
            .json(validate);
    }

    let { no_hp, bpr_id, no_rek, trx_code, trx_type, amount, trans_fee, token, keterangan, terminal_id, lokasi, tgl_trans, tgl_transmis, rrn, data } = req.body


    //    set tanggal transaksi
    let tgltrn = tgl_trans.substr(0, 8);
    //  set kode kantor
    let kdbank = no_rek.substr(0, 3);
    let kdcab = no_rek.substr(3, 2);
    let kdloc = no_rek.substr(5, 2);

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
            code: Sign_Off,
            status: "GAGAL",
            message: "Sedang Melakukan Closing",
            rrn: rrn,
            data: null
        });
    };

    try {
        let request = await db.sequelize.query(
            "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec from m_tabunganc where noacc = ?",
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
                    code: rek_tidakada,
                    status: "GAGAL",
                    message: "Rekening Tidak Ditemukan",
                    rrn: rrn,
                    data: null
                });


            } else if (request[0]["stsrec"] == "N") {

                console.log("Status Gagal ");
                console.log("message: Rekening Tidak Aktif");

                return res.status(400).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Tidak Aktif",
                    rrn: rrn,
                    data: null
                });


            } else if (request[0]["stsrec"] == "T") {

                console.log("Status Gagal ");
                console.log("message: Rekening Tutup");

                return res.status(400).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Tutup",
                    rrn: rrn,
                    data: null
                });


            } else if (request[0]["stsrec"] == "C") {

                console.log("Status Gagal ");
                console.log("message: Rekening Tutup");

                return res.status(400).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Tutup",
                    rrn: rrn,
                    data: null
                });


            } else if (request[0]["stsrec"] == "D") {

                console.log("Status Gagal ");
                console.log("message: Rekening Dihapus");

                return res.status(400).send({
                    code: rek_tutup,
                    status: "GAGAL",
                    message: "Rekening Dihapus",
                    rrn: rrn,
                    data: null
                });


            } else if (request[0]["stsrec"] == "A") {

                  // cek status blokir
                  if(request[0]["stsblok"] == "R"){
                    return res.status(400).send({
                        code: rek_blokir,
                        status: "GAGAL",
                        message: "Rekening Diblokir",
                        rrn:rrn,
                        data: null
                    });
                   };

                if (trx_code == Req_Token_Tarik_Tunai) {
                    // cek saldo cukup atau tidak
                    if (request[0]["saldoeff"] < amount + trans_fee) {
                        return res.status(400).send({
                            code: saldo_kurang,
                            status: "GAGAL",
                            message: "Saldo Tidak Cukup",
                            rrn: rrn,
                            data: null
                        });
                    } else {

                        //  mengurangi rekening nasabah pokok
                        let debet = await db.sequelize.query(
                            "update m_tabunganc set saldoakhir = saldoakhir - ? , mutasidr = mutasidr + ?,trnke=trnke + 1 where noacc = ?",
                            {
                                replacements: [amount, amount, no_rek]
                            }
                        );

                        return res.status(200).send(
                            {
                                code:Successful,
                                status:"SUKSES",
                                message:"Token Sukses",
                                rrn:rrn,
                                data:{
                                    no_rek:no_rek,
                                    nama:request[0]["fnama"],
                                    trx_type:trx_type,                                    
                                }
    
                        
                        })

                        // ngambil transaksi ke dr
                        let trnkedr = await db.sequelize.query(
                            "select * from m_tabunganc where noacc = ?",
                            {
                                replacements: [no_rek]
                            }
                        );

                        // ambil nomor transaksi
                        let notrndr = await db.sequelize.query(
                            "select nomor + 10 as notrn from nomaster where batch=?",
                            {
                                replacements: [BATCH]
                            }
                        );


                        let notrn = notrndr[0]["notrn"]

                        // insert transpc nasabah POK
                        [result, metadata] = await db.sequelize.query(
                            "insert into transpc (" +
                            "tgltrn,    batch,  notrn,  noacc,  dc, nominal,    stscetak,   kdtrnbuku,  trnke)" +
                            "values (" +
                            "?,         ?,      ?,      ?,      ?,  ?,          ?,          ?,          ?)",
                            {
                                replacements: [tgltrn, BATCH, notrn, no_rek, "D", nominal_pok, "N", KODE_TRN_BUKU, trnkedr[0]["trnke"]]
                            }
                        );

                        // input transaksi berdasarkan jenis acc cr
                        if (data.gl_jns_cr_2 == "1") {
                            // proses transaksi PPOB REKENING POkOK
                            let cracc = kdbank + kdcab + kdloc + data.gl_rek_cr_2;
                            let sbbperalihan_dr = kdbank + kdcab + kdloc + request[0]["sbbtab"];
                            let sbbperalihan_cr = kdbank + kdcab + kdloc + data.gl_rek_cr_2;
                            let tgljam = tgltrn + jam.getHours() + jam.getMinutes() + jam.getSeconds();

                            [result, metadata] = await db.sequelize.query(
                                "insert into transaksi (" +
                                "tgltrn,            trnuser,            batch,              notrn,              kodetrn," +
                                "dracc,             drmodul,            cracc,              crmodul,            dc," +
                                "dokumen,           nominal,            tglval,             ket,                kodebpr," +
                                "kodecab,           kodeloc,            ststrn,             inpuser,            inptgljam," +
                                "inpterm,           chguser,            chgtgljam,          chgterm,            autuser," +
                                "auttgljam,         autterm,            prog,               groupno,            modul," +
                                "sbbperalihan_dr,   sbbperalihan_cr,    stscetak,           thnbln,             jnstrnlx," +
                                "jnstrntx,          trnke_dr,           trnke_cr,           stscetakcr,         kdaodr," +
                                "kdaocr,            kdkoldr,            kdkolcr,            kdtrnbuku,          depfrom," +
                                "depto,             namadr,             namacr) " +
                                "values(" +
                                "?,                 ?,                  ?,                  ?,                  ?," +
                                "?,                 ?,                  ?,                  ?,                  ?," +
                                "?,                 ?,                  ?,                  ?,                  ?," +
                                "?,                 ?,                  ?,                  ?,                  ?," +
                                "?,                 ?,                  ?,                  ?,                  ?," +
                                "?,                 ?,                  ?,                  ?,                  ?," +
                                "?,                 ?,                  ?,                  ?,                  ?," +
                                "?,                 ?,                  ?,                  ?,                  ?," +
                                "?,                 ?,                  ?,                  ?,                  ?," +
                                "?,                 ?,                  ?)",
                                {
                                    replacements: [
                                        tgltrn, USER_ID, BATCH, notrn, KODE_TRN_PPOB,
                                        no_rek, '2', cracc, '1', "",
                                        rrn, nominal_pok, tgltrn, keterangan, kdbank,
                                        kdcab, kdloc, '5', USER_ID, tgljam,
                                        terminal_id, "", "", "", "",
                                        "", "", "ppob", 0, "",
                                        sbbperalihan_dr, sbbperalihan_cr, "N", tgltrn.substr(0, 5), "",
                                        "03", trnkedr[0]["trnke"], 0, "N", "",
                                        "", "", "", KODE_TRN_BUKU, "000",
                                        "", request[0]["fnama"], trnkedr[0]["fnama"]]
                                }
                            );
                            // insert transaksi ke tabungan OY
                        } else if (data.gl_jns_cr_2 == "2") {
                            let rek_OY = await db.sequelize.query(
                                "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec from m_tabunganc where noacc =?",
                                {
                                    replacements: [data.gl_rek_cr_2],
                                    type: db.sequelize.QueryTypes.SELECT,
                                }
                            );

                            // update saldo tabungan OY
                            await db.sequelize.query(
                                "update m_tabunganc set saldoakhir = saldoakhir + ?,mutasicr = mutasicr + ?,trnke = trnke + ? where noacc =?",
                                {
                                    replacements: [amount, amount, data.gl_rek_cr_2]
                                }
                            );
                            // ambil trnke cr
                            let trnkecr = await db.sequelize.query(
                                "select * from m_tabunganc where noacc = ?",
                                {
                                    replacements: [data.gl_rek_cr_2]
                                }
                            );

                            // insert transpc OY
                            [result, metadata] = await db.sequelize.query(
                                "insert into transpc (" +
                                "tgltrn,    batch,  notrn,  noacc,  dc, nominal,    stscetak,   kdtrnbuku,  trnke)" +
                                "values (" +
                                "?,         ?,      ?,      ?,      ?,  ?,          ?,          ?,          ?)",
                                {
                                    replacements: [tgltrn, BATCH, notrn, no_rek, "D", nominal_pok, "N", KODE_TRN_BUKU, trnke]
                                }
                            );
                        };
                    };


                } else {
                    return res.status(400).send({
                        code: invelid_transaction,
                        status: "GAGAL",
                        message: "Trx Type Tidak Ditemukan ",
                        rrn: rrn,
                        data: null
                    });
                };



            } else {

                console.log("Status Gagal ");
                console.log("No rekening Tidak Ditemukan");

                return res.status(400).send({
                    code: rek_tidakada,
                    status: "GAGAL",
                    message: "No rekening Tidak Ditemukan",
                    rrn: rrn,
                    data: null
                });
            }



        } else {
            console.log("Status Gagal ");
            console.log("No rekening Tidak Ditemukan");

            return res.status(400).send({
                code: rek_tidakada,
                status: "GAGAL",
                message: "No rekening Tidak Ditemukan",
                rrn: rrn,
                data: null
            });
        }

    } catch (error) {
        console.log('Error Inquiry Account', error);
        return res.status(400).send({
            code: rek_tidakada,
            status: "GAGAL",
            message: "No rekening Tidak Ditemukan",
            rrn: rrn,
            data: null
        });
    }

});

module.exports = router;