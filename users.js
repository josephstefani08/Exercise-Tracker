let mongoose = require('mongoose');

// Defining schema
let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  exercise: [{
    description: {type: String},
    duration: {type: Number},
    date: {type: Date}
  }]
});

module.exports = mongoose.model('user', userSchema);

// Maybe this structure for exercises
// https://docs.mongodb.com/manual/tutorial/model-embedded-one-to-many-relationships-between-documents/