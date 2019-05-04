const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const moment = require('moment');
moment().format();
const Schema = mongoose.Schema;
const fs = require('fs');
// This is the users.js file
const UserModel = require('./users');

// mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true});

// Unknown if this is needed, trying to get rid of depreciation console error
// https://mongoosejs.com/docs/deprecations.html#-findandmodify-
mongoose.set('useFindAndModify', false);

let db = mongoose.connection;

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// I can create a user by posting form data username to /api/exercise/new-user and returned will be an object with username and _id.
app.route('/api/exercise/new-user').post((req, res, next) => {
  //Get the username entered
  let username = req.body.username;
  
  // Verify the username is not taken
  UserModel.findOne({username: username}, (err, user) => {
    if(err) {
      console.log(err)
    } else if(user) {
      res.json({error: "Username is already taken"});
    } else {
      // If new user
      let userToCreate = new UserModel({
        username:username
      })
      // Write to the database
      userToCreate.save()
        .then(savedUsername => {
        res.json({new_user: savedUsername.username, id: savedUsername._id})
      })
      .catch(err => {
        res.json({error:"Unable to save new username to database or no username provided."});
      });
    }
  });
});

// I can get an array of all users by getting api/exercise/users with the same info as when creating a user.
app.get('/api/exercise/users', (req, res) => {
  // Show a json list of all users listed
  UserModel.find({}, (err, users) => {
    let userAll = {};
    users.forEach(user => userAll[user._id] = user)
    res.send(userAll);
  });
});

// I can add an exercise to any user by posting form data userId(_id), description, duration, and optionally date to /api/exercise/add. If no date supplied it will use current date. Returned will the the user object with also with the exercise fields added.
app.route('/api/exercise/add').post((req, res, next) => {
  // Get values from form
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = parseInt(req.body.duration);
  let date;
  
  if(req.body.date == "") {
    date = moment().format('YYYY-MM-DD');
  } else {
    date = moment(req.body.date).format('YYYY-MM-DD');
  }
  
  let exercise = {"description": description, "duration": duration, "date": date};
  
  // Validate users exists
  UserModel.findOneAndUpdate({_id: userId}, {$push: {exercise: exercise}}, (err, user) => {
    if(err) {
      res.json({error: err.message});
    } else {
      res.json({userId: user.userId, id: user._id, "description": description, "duration": duration, "date": date});
    }
  });
});

// I can retrieve a full exercise log of any user by getting /api/exercise/log with a parameter of userId(_id). Return will be the user object with added array log and count (total exercise count).

// I can retrieve a full exercise log of any user by getting /api/exercise/log with a parameter of userId(_id). Return will be the user object with added array log and count (total exercise count).

app.get('/api/exercise/log/:userId/:from?/:to?/:limit?', (req, res) => {
  let userId = req.params.userId;
  let from = req.query.from;
  let to = moment(req.query.to,'YYYY-MM-DD');
  let limit = parseInt(req.query.limit);
  let count;
  let foundExerciseRecords;
  
  if(from) {
    from = moment(req.query.from,'YYYY-MM-DD');
  } else {
    from = '';
  }
  
  /*
  Testing
  https://joseph-exercise-tracker.glitch.me/api/exercise/log/5ccddbe34448b70143d88b48?from=2019-05-03&to=2019-05-04
  */
  
  UserModel.findOne({_id: userId}, (err, user) => {
    if(err) {
      console.log('Error: ' + err)
    } else if(!user) {
      res.json({error: "User does not exist"});
    } else {
      foundExerciseRecords = user.exercise;
      if(from) {
        if(limit >= 1) {
          foundExerciseRecords = foundExerciseRecords.filter(userEntry => userEntry.date >= from && userEntry.date <= to);
          let newArray = [];
          newArray = foundExerciseRecords.slice(0, limit)
          count = newArray.length
          res.json({userId: userId, exercise_log: newArray, count: limit})
        } else {
          foundExerciseRecords = foundExerciseRecords.filter(userEntry => userEntry.date >= from && userEntry.date <= to);
          count = foundExerciseRecords.length;
          res.json({userId: userId, exercise_log: foundExerciseRecords, count: count})
        }
      } else {
        count = foundExerciseRecords.length;
        res.json({userId: userId, exercise_log: foundExerciseRecords, count: count});
      }
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});