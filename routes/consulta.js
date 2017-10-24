const _ = require('lodash');
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const multer = require('multer')();
const moment = require('moment');

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

const responseBase = { id: ID_PLATFORM, date: new Date(), url: 'req.hostname' };

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Platform API Server' });
  });


// -----------------------------------------------------------------
// Their Methods (Part2)
// -----------------------------------------------------------------

// POST - info
router.post('/info', (req, res, next) => {
    hardwareTable.view('info', 'info', (err, body) => {
        if (err) res.status(500).send({ err: 1, msg: err });
        else {
            let result = _.map(body.rows, (doc) => {
                const respValue = {};
                respValue[doc.key] = doc.value;
                return respValue;
            });
            res.status(200).send(Object.assign({}, responseBase, { hardware: result }));
        }
    });
});

// POST - search
router.post('/search', (req, res, next) => {
    const { id_hardware, start_date, finish_date } = req.body.search || {};
    hardwareTable.view('info', 'info', { key: id_hardware }, (err, body) => {
        if (err) res.status(500).send({ err: 1, msg: err });
        else {
            const respValue = body.rows[0] || null;
            if (respValue) {
                const search = { id_hardware: respValue.key, type: respValue.value.type };
                dataTable.view('search', 'search', { key: id_hardware }, (errData, bodyData) => {
                    if (errData) res.status(500).send({ err: 1, msg: errData });
                    else {
                        const hardwareData = _.map(bodyData.rows, (data) => Object.assign({}, data.value));
                        const timeFilter = _.filter(hardwareData, (data) => {
                            const registeredTime = moment(_.keys(data)[0]);
                            return registeredTime.isBetween(start_date, finish_date)
                        });
                        res.send(Object.assign({}, responseBase, { search }, { data: timeFilter }));
                    }
                });
            } else {
                res.send(Object.assign({}, responseBase));
            }
        }
    });
});

// POST - change
router.post('/change', (req, res, next) => {
    const changeInfo = req.body.change;
    const { date, rotation } = _.values(changeInfo)[0];
    dataTable.insert({ date, rotation, id_hardware: _.keys(changeInfo)[0] }, null, (err, body) => {
        if (err) res.status(500).send({ err: 1, msg: err });
        else {
            res.status(200).send(Object.assign({}, responseBase, { status: 'OK' }));
        }
    });
});

// -----------------------------------------------------------------
// Our Hardware (Part1)
// -----------------------------------------------------------------


// POST - storeData
router.post('/storeData', multer.array(), (req, res, next) => {
    // console.log('params: ', req.body);
    const { date, id_hardware, rotation } = req.body;
    dataTable.insert({ date, rotation, id_hardware }, null, (err, body) => {
        if (err) res.status(500).send({ err: 1, msg: err });
        else {
            res.status(200).send({ msg: 'Stored rotation' });
        } 
    });
});

// GET - shouldTurnOn
router.get('/shouldTurnOn', (req, res, next) => {
    nano.db.changes(DB_DATA, { descending: true, limit: 1 }, (err, body) => {
        const lastId = body.results.length > 0 ? body.results[0].id : null;
        if (!err) {
            dataTable.get(lastId, (errId, bodyDoc) => {
                const { rotation }  = bodyDoc;
                const status = rotation >= 50;
                if (!errId) res.status(200).send({ status });
            });
        }
    })
});

module.exports = router;