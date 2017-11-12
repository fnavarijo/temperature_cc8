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
            const responseDataObject = {};
            _.forEach(body.rows, (doc) => {
                responseDataObject[doc.key] = doc.value;
            });
            res.status(200).send(Object.assign({}, responseBase, { hardware: responseDataObject }));            
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
                        const hardwareData = _.map(bodyData.rows, (data) => data.value);
                        const timeFilter = _.filter(hardwareData, (data) => {
                            const registeredTime = moment(_.keys(data)[0]);
                            return registeredTime.isBetween(start_date, finish_date)
                        });
                        const responseObjectData = {};
                        _.forEach(timeFilter, (data) => {
                            const objectValue = _.values(data)[0];
                            objectValue['status'] = objectValue.sensor >= 50;
                            responseObjectData[_.keys(data)[0]] = objectValue;
                        });
                        res.send(Object.assign({}, responseBase, { search }, { data: responseObjectData }));
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
    const { status, freq } = _.values(changeInfo)[0];

    if (!freq) return res.status(500).send({ err: 1, msg: 'Faltan parametros' });

    const date = moment().format('YYYY-MM-DDTHH:mm:ss');
    const sensor = status ? 51 : 40;
    dataTable.insert({ date, sensor, freq, id_hardware: _.keys(changeInfo)[0] }, null, (err, body) => {
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
    const { date, id_hardware, freq, sensor, tag } = req.body;
    
    if (!date || !id_hardware || !freq || !sensor ||! tag) return res.status(500).send({ err: 1, msg: 'Faltan parametros' });

    hardwareTable.view('info', 'info', { key: id_hardware }, (err, body) => {
        if (!err) {
            const value = body.rows[0];
            
            if (value == undefined) {
                hardwareTable.insert({ id_hardware, tag, type: 'input' }, null, (err, body) => {
                    if (err) return res.status(500).send({ err: 1, msg: err });
                    nano.db.changes(DB_DATA, { descending: true, limit: 1 }, (err, body) => {
                        const lastId = body.results.length > 0 ? body.results[0].id : null;
                        if (!err) {
                            dataTable.get(lastId, (errId, bodyDoc) => {
                                const lastSensor = bodyDoc.sensor;
                                const lastFreq = bodyDoc.freq;
                                if (!errId){
                                    dataTable.insert({ date, sensor, freq, id_hardware }, null, (err, body) => {
                                        if (err) res.status(500).send({ err: 1, msg: err });
                                        else {
                                            res.status(200).send({ msg: 'Stored rotation', sensor: lastSensor, freq: lastFreq });
                                        } 
                                    });
                                } 
                            });          
                        }
                    });
                });
            } else {       
                nano.db.changes(DB_DATA, { descending: true, limit: 1 }, (err, body) => {
                    const lastId = body.results.length > 0 ? body.results[0].id : null;
                    if (!err) {
                        dataTable.get(lastId, (errId, bodyDoc) => {
                            const lastSensor = bodyDoc.sensor;
                            const lastFreq = bodyDoc.freq;
                            // const { sensor, freq } = bodyDoc;
                            if (!errId){
                                dataTable.insert({ date, sensor, freq, id_hardware }, null, (err, body) => {
                                    if (err) res.status(500).send({ err: 1, msg: err });
                                    else {
                                        res.status(200).send({ msg: 'Stored rotation', sensor: lastSensor, freq: lastFreq });
                                        // res.status(200).send({ status });
                                    } 
                                });
                            } 
                        });          
                    }
                });
            }
        }
    });
    
    




});

// GET - shouldTurnOn
router.get('/shouldTurnOn', multer.array(), (req, res, next) => {
    const { id_output, tag } = req.query;
    
    if (!id_output || !tag) return res.status(500).send({ err: 1, msg: 'Faltan parametros' });

    hardwareTable.view('info', 'info', { key: id_output }, (err, body) => {
        if (!err) {
            const value = body.rows[0];

            if (value == undefined) {
                hardwareTable.insert({ id_hardware: id_output, tag, type: 'output' }, null, (err, body) => {
                    if (err) return res.status(500).send({ err: 1, msg: err });
                    nano.db.changes(DB_DATA, { descending: true, limit: 1 }, (err, body) => {
                        const lastId = body.results.length > 0 ? body.results[0].id : null;
                        if (!err) {
                            dataTable.get(lastId, (errId, bodyDoc) => {
                                const { sensor, id_hardware }  = bodyDoc;
                                const status = sensor >= 50;
                                if (!errId){
                                    res.header("Access-Control-Allow-Origin", "*");
                                    res.status(200).send({ status, id_hardware });
                                } 
                            });
                        }
                    });
                });
            } else {          
                nano.db.changes(DB_DATA, { descending: true, limit: 1 }, (err, body) => {
                    const lastId = body.results.length > 0 ? body.results[0].id : null;
                    if (!err) {
                        dataTable.get(lastId, (errId, bodyDoc) => {
                            const { sensor, id_hardware }  = bodyDoc;
                            const status = sensor >= 50;
                            if (!errId){
                                res.header("Access-Control-Allow-Origin", "*");
                                res.status(200).send({ status, id_hardware });
                            } 
                        });
                    }
                });
            }
        }
    })


});

module.exports = router;