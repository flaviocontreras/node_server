var mongoose = require('mongoose');

var Contact = mongoose.model('Contact', {
  name: {
    type: String,
    required: true,
    minlength: 1,
    trim: true
  },
  details: {
    type: String,
    trim: true
  },
  photo: {
    type: String,
    default: 'contact/images/user.png'
  },
  _creator: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
});

module.exports = {
  Contact
};
