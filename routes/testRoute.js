// routes/test.js
var express = require('express');
var router = express.Router();

router.get('/', (req, res)=>{

    try {

        res.json({
            server:'ok'
        })

    } catch (err){
        console.error(`Server error ${err.message}`)
    }
})

module.exports = router;