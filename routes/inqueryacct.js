var express = require('express');
var router = express.Router();
const Validator = require('fastest-validator');
const db = require("../connection/index");
const v = new Validator();

router.get('/', async (req, res) => {
    const schema = {
        no_rek: 'string'
    }

    const validate = v.validate(req.body, schema);

    if (validate.length) {
        return res
        .status(400)
        .json(validate);
    }

    const{ no_rek} =req.body;
    try{
        let request = await db.sequelize.query(
            "select noacc,fnama from m_tabunganc where noacc =? and stsrec ='A'",
            {
                replacements:[no_rek],
                type:db.sequelize.QueryTypes.SELECT,
            }
        )

        if (!request.length){
            res.status(400).send({
                code:"999",
                status:"GAGAL",
                message:"Gagal Account Tidak Titemukan",
                data:null,
            });
        }else{
            res.status(200).send({
                code:"000",
                status:"OK",
                message:"success",
                data:request[0],
            });

        }

        
    }catch (error){
            console.log('Error Inquiry Account',error);
            res.send(error);
    }

});

module.exports = router;