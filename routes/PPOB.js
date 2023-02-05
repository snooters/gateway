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
            token_mpin: "string",
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
            .status(400)
            .json(validate);
    }

    let {no_hp,bpr_id,no_rek,product_name,token_mpin,trx_code,trx_type,amount,trans_fee,tgl_trans,tgl_transmis,rrn,data} = req.body;
   // let { no_rek, trx_code, rek_pok, rek_fee, nominal_pok, nominal_fee, terminal_id, rrn, keterangan } = req.body;
   
   rek_pok = data.gl_rek_cr_1;
   rek_fee = data.gl_rek_cr_2;
   nominal_pok = data.gl_amount_cr_1;
   nominal_fee = data.gl_amount_cr_2;
   terminal_id =""
   keterangan =product_name ;
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
    }
 
    try {
        // cari data tabungan nasabah
        request = await db.sequelize.query(
            "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke + 1 as trnke from m_tabunganc  where noacc =?",
            {
                replacements: [no_rek],
                type: db.sequelize.QueryTypes.SELECT,
            }
        )

        // validasi status rekening
        if (request[0]["stsrec"] == null) {
            return res.status(400).send({
                code: rek_tidakada,
                status: "GAGAL",
                message: "Rekening Tidak Ditemukan",
                rrn: rrn,
                data: null
            });
        } else if (request[0]["stsrec"] == "N") {
            return res.status(400).send({
                code: rek_notauth,
                status: "GAGAL",
                message: "Rekening Tidak Aktif",
                rrn: rrn,
                data: null
            });
        } else if (request[0]["stsrec"] == "T") {
            return res.status(400).send({
                code: rek_tutup,
                status: "GAGAL",
                message: "Rekening Tutup",
                rrn: rrn,
                data: null
            });
        } else if (request[0]["stsrec"] == "C") {
            return res.status(400).send({
                code: rek_tutup,
                status: "GAGAL",
                message: "Rekening Tutup",
                rrn: rrn,
                data: null
            });
        } else if (request[0]["stsrec"] == "D") {
            return res.status(400).send({
                code: rek_notauth,
                status: "GAGAL",
                message: "Rekening Dihapus",
                rrn: rrn,
                data: null
            });
        } else if (request[0]["stsrec"] == "A") {

            if (request[0]["saldoeff"] < nominal_pok + nominal_fee) {
                return res.status(404).send({
                    code: saldo_kurang,
                    status: "GAGAL",
                    message: "Saldo Tabungan Tidak Cukup",
                    rrn: rrn,
                    data: null
                });
            }
            // cek kode transaksi
            // cari rekpok POKOK OY
            if (trx_code == PPOB) {
                gl_pok = await db.sequelize.query(
                    "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke + 1 as trnke from m_tabunganc  where noacc =?",
                    {
                        replacements: [rek_pok],
                        type: db.sequelize.QueryTypes.SELECT,
                    }
                )

                if (!gl_pok.length) {
                    return res.status(404).send({
                        code: rek_tidakada,
                        status: "GAGAL",
                        message: "Rekening Pok Tidak Ditemukan",
                        rrn: rrn,
                        data: null

                    });
                };

                // cari GL fee OY
                gl_fee = await db.sequelize.query(
                    "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke + 1 as trnke from m_tabunganc  where noacc =?",
                    {
                        replacements: [rek_fee],
                        type: db.sequelize.QueryTypes.SELECT,
                    }
                )

                if (!gl_fee.length) {
                    return res.status(404).send({
                        code: rek_tidakada,
                        status: "GAGAL",
                        message: "Rekening Fee Tidak Ditemukan",
                        rrn: rrn,
                        data: null
                    });
                }

                let result

                //PROSES update tabungan nasabah PPOB
                [result, metadata] = await db.sequelize.query(
                    "update m_tabunganc set saldoakhir= saldoakhir - ?, trnke = trnke + 1,mutasidr =  mutasidr + ? where noacc=?",
                    {
                        replacements: [nominal_pok,nominal_pok, no_rek],
                    }
                );

                if (!metadata) {
                    return res.status(400).send({
                        code: invelid_transaction,
                        status: "GAGAL",
                        message: "Gagal Mengurangi Saldo Tabungan",
                        rrn: rrn,
                        data: null
                    });
                };

                // proses update tabungan rek pok OY

                [result, metadata] = await db.sequelize.query(
                    "update m_tabunganc set saldoakhir= saldoakhir + ?, trnke = trnke + 1,mutasicr =  mutasicr + ? where noacc=?",
                    {
                        replacements: [nominal_pok,nominal_pok, rek_pok],
                    }
                );

                if (!metadata) {
                    return res.status(400).send({
                        code: invelid_transaction,
                        status: "GAGAL",
                        message: "Gagal Menambah Saldo Tabungan Pok",
                        rrn: rrn,
                        data: null
                    });
                };


                // get tanggal transaksi
                let tanggal = await db.sequelize.query(
                    "select right(tgl,4) as thn , SUBSTRING(tgl,3,2) as bln, LEFT(tgl,2)as tgl from tanggal",
                    {
                        type: db.sequelize.QueryTypes.SELECT,
                    }
                );

                let tgltrn = tanggal[0]["thn"] + tanggal[0]["bln"] + tanggal[0]["tgl"];

                // get nomor transaksi
                let notransaksi = await db.sequelize.query(
                    "select nomor + 10 as notrn from nomaster where batch=?",
                    {
                        replacements: [parseFloat(BATCH)],
                        type: db.sequelize.QueryTypes.SELECT,
                    }
                );

                let notrn = notransaksi[0]["notrn"];
                let kdbank = no_rek.substr(0, 3);
                let kdcab = no_rek.substr(3, 2);
                let kdloc = no_rek.substr(5, 2);
                let sbbperalihan_dr = kdbank + kdcab + kdloc + "10" + request[0]["sbbtab"];
                let sbbperalihan_cr = rek_pok.substr(0, 3) + rek_pok.substr(3, 2) + rek_pok.substr(5, 2) + "10" + gl_pok[0]["sbbtab"];
                let trnke = request[0]["trnke"]; 
                noreff = BATCH + notrn 

                // update nomor transaksi
                await db.sequelize.query(
                    "update nomaster set nomor = ? where batch= ?",
                    {
                        replacements: [notrn, parseFloat(BATCH)]
                    }
                );

                let jam = new Date()
                let tgljam = tgltrn + jam.getHours() + jam.getMinutes() + jam.getSeconds();

                // proses transaksi PPOB REKENING POkOK
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
                    tgltrn,             USER_ID,            BATCH,              notrn,               KODE_TRN_PPOB,
                    no_rek,             '2',                rek_pok,            '2',                 "",
                    rrn,                nominal_pok,        tgltrn,             keterangan,          kdbank,
                    kdcab,              kdloc,              '5',                USER_ID,            tgljam,
                    terminal_id,        "",                 "",                 "",                 "",
                    "",                 "",                 "ppob",             0,                  "",
                    sbbperalihan_dr,    sbbperalihan_cr,    "N",                tanggal[0]["thn"] + tanggal[0]["bln"], "",
                    "03",               trnke,              0,                  "N",                "",
                    "",                 "",                 "",                 KODE_TRN_BUKU,      "000",
                    "",                 request[0]["fnama"],gl_pok[0]["fnama"]]
                    }

                );

                // insert transpc nasabah POK
                [result, metadata] = await db.sequelize.query(
                    "insert into transpc (" +
                    "tgltrn,    batch,  notrn,  noacc,  dc, nominal,    stscetak,   kdtrnbuku,  trnke)" +
                    "values (" +
                    "?,         ?,      ?,      ?,      ?,  ?,          ?,          ?,          ?)",
                    {
                        replacements: [tgltrn, BATCH, notrn, no_rek, "D", nominal_pok, "N", KODE_TRN_BUKU, trnke]
                    }
                );
                // get trn ke rek pok OY
                let trnkepok = await db.sequelize.query(
                    "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke  from m_tabunganc  where noacc =?",
                    {
                        replacements: [rek_pok],
                        type: db.sequelize.QueryTypes.SELECT,
                    }
                )
                let tanspcpokke = trnkepok[0]["trnke"];

                // insert transpc rek pok
                [result, metadata] = await db.sequelize.query(
                    "insert into transpc (" +
                    "tgltrn,    batch,  notrn,  noacc,  dc, nominal,    stscetak,   kdtrnbuku,  trnke)" +
                    "values (" +
                    "?,         ?,      ?,      ?,      ?,  ?,          ?,          ?,          ?)",
                    {
                        replacements: [tgltrn, BATCH, notrn, rek_pok, "C", nominal_pok, "N", KODE_TRN_BUKU, tanspcpokke]
                    }
                );

                // update transaksi fee ke di tabungan nasabah
                await db.sequelize.query(
                    "update m_tabunganc set saldoakhir = saldoakhir - ?, trnke = trnke +1,mutasidr =  mutasidr - ? where noacc=?",
                    {
                        replacements: [nominal_fee,nominal_fee, no_rek]
                    }
                );

                // update transaksi fee ke di tabungan OY
                await db.sequelize.query(
                    "update m_tabunganc set saldoakhir = saldoakhir + ?, trnke = trnke + 1, mutasicr =  mutasicr + ? where noacc= ?",
                    {
                        replacements: [nominal_fee, nominal_fee, rek_fee]
                    }
                );

                let trnkefee = await db.sequelize.query(
                    "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke  from m_tabunganc  where noacc =?",
                    {
                        replacements: [rek_fee],
                        type: db.sequelize.QueryTypes.SELECT,
                    }
                )
                let tanspcfeeke = trnkepok[0]["trnke"];

                // get nomor transaksi
                notransaksi = await db.sequelize.query(
                    "select nomor+10 as notrn from nomaster where batch=?",
                    {
                        replacements: [parseFloat(BATCH)],
                        type: db.sequelize.QueryTypes.SELECT,
                    }
                );

                // proses transaksi PPOB FEE

                notrn = notransaksi[0]["notrn"];
                sbbperalihan_cr = kdbank + kdcab + kdloc + "10" + trnkefee[0]["sbbtab"];
                trnke = tanspcfeeke;
                noreff = noreff + notrn + rrn
                // update nomor transaksi
                await db.sequelize.query(
                    "update nomaster set nomor = ? where batch=?",
                    {
                        replacements: [notrn, parseFloat(BATCH)]
                    }
                );

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
                    "depto,             namadr,             namacr               ) " +
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
                    "?,                 ?,                  ?                   )",
                    {
                        replacements: [
                    tgltrn,             USER_ID,            BATCH,              notrn,              KODE_TRN_PPOB,
                    no_rek,             '2',                rek_fee,            '2',                "",
                    rrn,                nominal_fee,        tgltrn,             "FEE " + keterangan,kdbank,
                    kdcab,              kdloc,              "5",                USER_ID,            tgljam,
                    terminal_id,        "",                 "",                 "",                 "", 
                    "",                 "",                 "ppob",             0,                  "", 
                    sbbperalihan_dr,    sbbperalihan_cr,    "N",                tanggal[0]["thn"] + tanggal[0]["bln"], "",
                    "03",               trnke,              0,                  "N",                "",
                    "",                 "",                 "",                 KODE_TRN_BUKU,      "000",
                    "",                 request[0]["fnama"], gl_fee[0]["fnama"]]
                    }

                );
                let trnkedeb1 = await db.sequelize.query(
                    "select noacc,fnama,saldoakhir ,saldoakhir - case when saldoblok IS NULL  then 0  else saldoblok end  - (select minsaldo from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as  saldoeff,stsrec,  (select sbbprinc from setup_tabungan where kodeprd = m_tabunganc.kodeprd) as sbbtab,trnke  from m_tabunganc  where noacc =?",
                    {
                        replacements: [no_rek],
                        type: db.sequelize.QueryTypes.SELECT,
                    }
                )
                let trnkedeb = trnkedeb1[0]["trnke"];

                // insert transpc fee nasabah
                [result, metadata] = await db.sequelize.query(
                    "insert into transpc (" +
                    "tgltrn,    batch,  notrn,  noacc,  dc, nominal,    stscetak,   kdtrnbuku,  trnke)" +
                    "values (" +
                    "?,         ?,      ?,      ?,      ?,  ?,          ?,          ?,          ?)",
                    {
                        replacements: [tgltrn, BATCH, notrn, no_rek, "D", nominal_fee, "N", KODE_TRN_BUKU, trnkedeb]
                    }
                );

                // insert transpc fee OY
                [result, metadata] = await db.sequelize.query(
                    "insert into transpc (" +
                    "tgltrn,    batch,  notrn,  noacc,  dc, nominal,    stscetak,   kdtrnbuku,  trnke)" +
                    "values (" +
                    "?,         ?,      ?,      ?,      ?,  ?,          ?,          ?,          ?)",
                    {
                        replacements: [tgltrn, BATCH, notrn, rek_fee, "C", nominal_fee, "N", KODE_TRN_BUKU, tanspcfeeke]
                    }
                );


                return res.status(200).send({
                    code: Successful,
                    status: "SUKSES",
                    message: "Transaksi PPOB :" + keterangan + "SUKSES",
                    rrn: rrn,
                    data: {
                        "No_rek": no_rek,
                        "Nama": request[0]["fnama"],
                        "Nominal": nominal_pok + nominal_fee,
                        "noreff": noreff,
                        "gl_rek_cr_1":rek_pok,
                        "gl_rek_cr_1_nama" :gl_pok[0]["fnama"],
                        "gl_amount_cr_1": nominal_pok,
                        "gl_rek_cr_2":rek_fee,
                        "gl_rek_cr_2_nama": gl_fee[0]["fnama"],
                        "gl_amount_cr_2":nominal_fee
                        
                    }
                });

            } else {
                return res.status(400).send({
                    code: rek_tidakada,
                    status: "GAGAL",
                    message: "Rekening Tidak Ditemukan",
                    rrn: rrn,
                    data: null
                });
            }

        } else {
            // jika rekening tidak ditemukan 
            return res.status(400).send({
                code: invelid_transaction,
                status: "GAGAL",
                message: "Kode Transaksi Tidak ditemukan",
                rrn: rrn,
                data: null
            });
        }
    } catch (error) {
        console.log('Error Inquiry Account PPOB', error);
        return res.status(400).send({
            code: rek_tidakada,
            status: "GAGAL",
            message: "Rekening Tidak Ditemukan ",
            rrn: rrn,
            data: null
        });
    }

});

module.exports = router;