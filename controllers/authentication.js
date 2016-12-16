const jwt = require('jwt-simple');
const { User } = require('../models/user');

function tokenForUser(user) {
  const timestamp = new Date().getTime();
  // sub is short for subject, and its the convention
  // iat is short for issued at time, and its another convention
  return jwt.encode({ sub: user.id, iat: timestamp }, process.env.JWT_SECRET);
}

exports.signin = function(req, res, next) {
  // User has already had their email and password auth'd
  // We just need to give them a token
  res.send({ token: tokenForUser(req.user) });
};

exports.signup = function(req, res, next) {
  const { email, password } = req.body;
  // See if a user with the given email exists
  if (!email || !password) {
    return res.status(422).send({ error: "You must provide email and password" });
  }

  User.findOne({ email }, (err, existingUser) => {
    if (err) { return next(err); }
    // If a user with email does exist, return an Error
    if (existingUser) {
      return res.status(422).send({ error: 'Email is in use'});
    }

    // If a user with email does NOT exist, create and save user record
    const user = new User({
      email,
      password
    });

    user.save((e) => {
      if (e) { return next(e); }
      res.json({ token: tokenForUser(user) });
    });
  });

  // Respond to request indicating the user was created
}
