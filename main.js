var express = require('express');
var app = express();
var router = express.Router();
var bodyParser = require('body-parser');
var mongoConn = require('mongodb');
var assert = require('assert');

var path = require('path');

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
    extended: true
}));

var assert = require('assert');
var uri = "mongodb://witnessUser:thewitness@ds161410.mlab.com:61410/witness-data";

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/users', function(req, res) {
    console.log('Request to pull users');
    mongoConn.connect(uri, function(err, db) {

        var users = db.collection('users').find({}).sort({score: -1}).toArray()
        console.log('query done');

        users.then(function (fulfilled) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.send(fulfilled);
            console.log('users sent');
        });
        db.close();
    });
});

app.post('/users', function(req, res) {
    console.log('Adding a new user');
    console.log(req.body);

    var newUser = {
        id: req.body.sessionID,
        name: req.body.userName,
        score: 0
    };

    if(newUser['name'] == '') {
        newUser['name'] = 'Anonymous Mahanet User';
    }

    mongoConn.connect(uri, function(err, db) {
        var result = db.collection('users').insertOne(newUser, function(err, req) {
            console.log('Item with name ' + newUser['name'] + ' inserted');
            db.close();
        });

    });
    res.send("OK");
});

app.post('/scoring', function(req, res) {
    console.log(req.body);
    mongoConn.connect(uri, function(err, db) {
        console.log('logging into mongo to check if user exists');
        console.log(req.body.sessionID);

        var user = db.collection('users').findOne({sessionID: req.body.sessionID});
        console.log(user);
        user.then(
            function(fulfilled)
            {
                console.log(fulfilled);
                if(fulfilled == null) {
                    console.log('User not found');
                    res.send('invalid user');
                }
        
                else {
                    fulfilled.score = fulfilled.score + req.body.score;
                    db.collection('users').update({sessionID: fulfilled.sessionID}, {$set: {score: fulfilled.score}});
                    console.log('Updated user (' + fulfilled.sessionID + ") " + fulfilled.name);
                    res.send('OK');
                }
            }
        );
        
    });
});



var port = 8080;

app.listen(port, function() {
    console.log("Connection started")
});

module.exports = router;

// Console will print the message
console.log('Server running at http://127.0.0.1:' + port);
