const _ = require('lodash');
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer')();

const DB_HARDWARE = 'hardware';
const DB_DATA = 'data';
const ID_PLATFORM = 'PT_CC8Project001';

const nano = require('nano')('http://docker_couch_1:5984');
nano.db.create(DB_HARDWARE);
nano.db.create(DB_DATA);
const hardwareTable = nano.db.use(DB_HARDWARE);
const dataTable = nano.db.use(DB_DATA);

express().use(bodyParser.json());
express().use(bodyParser.urlencoded({ extended: true }));

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Platform API Server' });
  });


// POST - info
router.post('/info', (req, res, next) => {
    hardwareTable.list({ include_docs: true }, (err, body) => {
        if (err) res.status(500).send({ err: 1, msg: err });
        else {
            let result = _.map(body.rows, 'doc');
            result = _.map(result, (object) => _.omit(object, ['_id', '_rev']));
            res.status(200).send({ id: ID_PLATFORM, date: new Date(), url: req.hostname, hardware: result });
        } 
    });
});

// POST - search
router.post('/search', (req, res, next) => {
    const { id_hardware, start_date, finish_date } = req.body.search || {};
    hardwareTable.list({ include_docs: true, key: { type: 'input' } }, (err, body) => {
        if (err) res.status(500).send({ err: 1, msg: err });
        else {
            res.send(body);
        }
    });

});

// router.get('/', (req, res, next) => {
//     tempTable.list({include_docs: true}, (err, body) => {
//         if (err) res.send('err');
//         else{
//             const result = _.map(body.rows, 'doc');
//             res.status(200).send({ result });
//         } 
//     });
// });

// router.get('/shouldTurnOn', (req, res, next) => {
//     nano.db.changes(DB_HARDWARE, { descending: true, limit: 1 }, (err, body) => {
//         const lastId = body.results.length > 0 ? body.results[0].id : null;
//         if (!err) {
//             hardwareTable.get(lastId, (errId, bodyDoc) => {
//                 if (!errId) res.status(200).send({ result: bodyDoc });
//             });
//         }
//     })
// });

// router.post('/', multer.array(), (req, res, next) => {
//     const { fecha, temperature } = req.body;
//     hardwareTable.insert({ fecha, temperature }, null, (err, body) => {
//         if (err) {
//             console.log(err);
//             res.status(500).send(err);
//         } else {
//             res.status(200).send({ msg: 'Stored temperature' });
//         } 
//     });
// });

module.exports = router;