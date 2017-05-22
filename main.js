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


/// Returns every user in the db
app.get('/users', function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    console.log('Request to pull all users');

    mongoConn.connect(uri, function(err, db) {
        var users = db.collection('users').find({}).sort({score: -1}).toArray();

        users.then((fulfilled) => {
            res.send(fulfilled);
            console.log('users sent');
        });

        db.close();
    });
});


/// Gets a sessionID
/// Returns that user, or an error
app.get('/users/:id', function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    console.log('Request to pull a single user');

    if(req.params.id == undefined || req.params.id == '') {
        console.log('User not sent - invalid sessionID');
        res.send('Error: Invalid sessionID');
    } else {
        mongoConn.connect(uri, function(err, db) {
            var user = db.collection('users').findOne({sessionID: req.params.id});
            user.then((fulfilled) => {
                if(fulfilled == undefined || fulfilled == '') {
                    console.log('User not send - does not exist');
                    res.send('Error: No such user');
                } else {
                    console.log('User (' + fulfilled.sessionID + ') ' + fulfilled.name + ' sent.')
                    res.send(fulfilled);
                }
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
            if(fulfilled != null) {
                console.log("User with that sessionID already exists");
                res.send('Error: sessionID already in use');
                db.close();
            } else {
                var result = db.collection('users').insertOne(newUser, function(err, req) {
                    console.log('Item with name ' + newUser['name'] + ' inserted');
                    res.send('OK');
                    db.close();
                });
            }
        });
    });
});

/// Gets a sessionID and a score.
/// If user with sessionID exists, updates the user's score with the amount sent (adds)
/// Else, creates the user
/// Returns the updated score
app.post('/scoring', function(req, res) {
  console.log('Request for scoring');
    mongoConn.connect(uri, function(err, db) {
      console.log(err);

        console.log('logging into mongo to check if user exists');

        var user = db.collection('users').findOne({sessionID: req.body.sessionID});
        
        user.then((fulfilled) => {
          if(fulfilled == null) {
            console.log('User not found, creating new user');
            var newUser = {
              sessionID: req.body.sessionID,
              name: req.body.userName,
              score: parseInt(req.body.score)
            };
            if(newUser['name'] == undefined || newUser['name'] == '') {
              newUser['name'] = 'Anonymous Mahanet User';
            }

            var result = db.collection('users').insertOne(newUser, function(err, req) {
              console.log('Item with name ' + newUser['name'] + ' inserted - Through /scoring');
              res.send({status: "OK", score: newUser.score});
              db.close();
            });

          } else {
            fulfilled.score = parseInt(fulfilled.score) + parseInt(req.body.score);
            db.collection('users').update({sessionID: fulfilled.sessionID}, {$set: {score: fulfilled.score}});
            console.log('Updated user (' + fulfilled.sessionID + ") " + fulfilled.name + ' with ' + req.body.score + ' points.');
            res.send({status: "OK", score: fulfilled.score});
            db.close();
          }
        });
    });
});


var port = 8080;

app.listen(port, function() {
    console.log("Connection started")
});

module.exports = router;

// Console will print the message
console.log('Server running at http://127.0.0.1:' + port);
