const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();

express().use(bodyParser.json());
express().use(bodyParser.urlencoded({ extended: true }));

router.get('/', (req, res, next) => {
    res.send('Getting a temperature');
});

router.post('/', upload.array(), (req, res, next) => {
    console.log(req.body);
    res.send('saving');
});

module.exports = router;