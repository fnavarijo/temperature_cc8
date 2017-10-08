const _ = require('lodash');
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer')();

const DB_TABLE = 'temperature';

const nano = require('nano')('http://docker_couch_1:5984');
nano.db.create(DB_TABLE);
const tempTable = nano.db.use(DB_TABLE);

express().use(bodyParser.json());
express().use(bodyParser.urlencoded({ extended: true }));

router.get('/', (req, res, next) => {
    tempTable.list({include_docs: true}, (err, body) => {
        if (err) res.send('err');
        else{
            const result = _.map(body.rows, 'doc');
            res.send(result);
        } 
    });
});

router.get('/shouldTurnOn', (req, res, next) => {
    nano.db.changes(DB_TABLE, { descending: true, limit: 1 }, (err, body) => {
        const lastId = body.results.length > 0 ? body.results[0].id : null;
        if (!err) {
            tempTable.get(lastId, (errId, bodyDoc) => {
                if (!errId) res.send(bodyDoc);
            });
        }
    })
});

router.post('/', multer.array(), (req, res, next) => {
    const { fecha, temperature } = req.body;
    tempTable.insert({ fecha, temperature }, null, (err, body) => {
        if (err) {
            console.log(err);
            res.status(500).send(err);
        } else {
            res.send('Stored temperature');
        } 
    });
});

module.exports = router;