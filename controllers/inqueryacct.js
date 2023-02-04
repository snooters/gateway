const router = require('express').Router()
const db = require("../connection");
const inquiry_account = async (req, res) => {
    let {no_hp, no_rek, bpr_id, tgl_trans, tgl_transmis, rrn} = req.body;
    try {
        let number = Math.random() * 30
        let request = await db.sequelize.query(
            `SELECT no_hp, no_rek, bpr_id, nama_rek FROM dummy_rek_tabungan WHERE bpr_id = ? AND no_rek = ?` ,
            {
                replacements: [bpr_id, no_rek],
                type: db.sequelize.QueryTypes.SELECT,
            }
        )
        if (!request.length) {
            res.status(200).send({
                code: "999",
                status: "ok",
                message: "Gagal Account Tidak Ditemukan",
                data: null,
            });
        } else {
            request[0]["tgl_trans"] = tgl_trans
            request[0]["tgl_transmis"] = moment().add(number, "minute").format('YYYY-MM-DD HH:mm:ss')
            request[0]["rrn"] = rrn
            res.status(200).send({
                code: "000",
                status: "ok",
                message: "Success",
                data: request[0],
            });
        }
    } catch (error) {
      //--error server--//
      console.log("erro get product", error);
      res.send(error);
    }
};