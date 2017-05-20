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


// Either gets an empty request or a request with ID
// If it got an empty request, returns every user in the db.
// Else, returns a single user.
app.get('/users', function(req, res) {
    if(req.body.sessionID == undefined || req.body.sessionID == '') {
        console.log('Request to pull users');
        mongoConn.connect(uri, function(err, db) {

            var users = db.collection('users').find({}).sort({score: -1}).toArray()
            console.log('query done');

            users.then((fulfilled) => {
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                res.send(fulfilled);
                console.log('users sent');
            });
            db.close();
        });
    }
    else {
        mongoConn.connect(uri, function(err, db) {
            var user = db.collection('users').findOne({sessionID: req.body.sessionID});
            user.then((fulfilled) => {
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                console.log('User (' + fulfilled.sessionID + ') ' + fulfilled.name + ' sent.')
                res.send(fulfilled);
            });
            db.close();
        });
    }
});


// Gets sessionID and userName for new user. 
// If sessionID isn't in use, inserts into database. 
// else: return error
app.post('/users', function(req, res) {
    console.log('Adding a new user');
    console.log(req.body);

    var newUser = {
        sessionID: req.body.sessionID,
        name: req.body.userName,
        score: 0
    };

    if(newUser['name'] == undefined || newUser['name'] == '') {
        newUser['name'] = 'Anonymous Mahanet User';
    }

    mongoConn.connect(uri, function(err, db) {
        var user = db.collection('users').findOne({sessionID: req.body.sessionID});
        user.then((fulfilled) => {
            // Checking to see if a user with that sessionID already exists
            console.log(fulfilled);
            if(fulfilled != null) {
                console.log("User with that sessionID already exists");
                res.send('Error: sessionID already in use');
            } else {
                var result = db.collection('users').insertOne(newUser, function(err, req) {
                    console.log('Item with name ' + newUser['name'] + ' inserted');
                    res.send('OK');
                });
            }
        });
    });
});

/// Gets a sessionID and a score.
/// If user with sessionID exists, updates the user's score with the amount sent (adds)
/// Else, returns error
app.post('/scoring', function(req, res) {
    mongoConn.connect(uri, function(err, db) {
        console.log('logging into mongo to check if user exists');

        var user = db.collection('users').findOne({sessionID: req.body.sessionID});
        console.log(user);
        user.then((fulfilled) => {
            console.log(fulfilled);
            if(fulfilled == null) {
                console.log('User not found');
                res.send('Error: Invalid sessionID');
            } else {
                fulfilled.score = parseInt(fulfilled.score) + parseInt(req.body.score);
                db.collection('users').update({sessionID: fulfilled.sessionID}, {$set: {score: fulfilled.score}});
                console.log('Updated user (' + fulfilled.sessionID + ") " + fulfilled.name + ' with ' + req.body.score + ' points.');
                res.send('OK');
            }
        });

        db.close();
    });
});



var port = 8080;

app.listen(port, function() {
    console.log("Connection started")
});

module.exports = router;

// Console will print the message
console.log('Server running at http://127.0.0.1:' + port);
