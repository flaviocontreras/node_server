const _ = require('lodash');
const multer = require('multer');
const path = require('path');
const Authentication = require('../controllers/authentication');
const passportService = require('../services/passport');
const passport = require('passport');
const { Contact } = require('../models/contact');
const { ObjectID } = require('mongodb');

// session false indicates to not create a cookie based session
const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignin = passport.authenticate('local', { session: false });
var upload = multer({ dest: path.join(__dirname, '../public/contact/images')});

module.exports = function(app) {

  app.post('/contact', requireAuth, upload.single('photo'), (req, res) => {
    console.log(req.body);
    console.log(req.file);
    let photo;
    if (req.file) {
      photo = req.file.filename;
    }

    var contact = new Contact({
      name: req.body.name,
      details: req.body.details,
      photo,
      _creator: req.user._id
    });

    contact.save().then((doc) => {
      res.send(doc);
    }, (e) => {
      res.status(400).send(e);
    });
  });

  app.get('/contact', requireAuth, (req, res) => {

    Contact.find({
      _creator: req.user.id
    }).then((contacts) => {
      res.send({ contacts });
    }, (e) => {
      res.status(400).send(e);
    });

  });

  app.get('/contact/:id', requireAuth, (req, res) => {
    var { id } = req.params;

    if (!ObjectID.isValid(id)) {
      return res.status(404).send();
    } else {
      Contact.findOne({
        _id: id,
        _creator: req.user.id
      }).then((contact) => {
        if (!contact) {
          return res.status(404).send();
        }

        return res.send({ contact });
      }, (e) => {
        return res.status(400).send(e);
      });
    }

  });

  app.delete('/contact/:id', requireAuth, (req, res) => {
    var { id } = req.params;

    if (!ObjectID.isValid(id)) {
      return res.status(404).send();
    } else {
      Contact.findOneAndRemove({
        _id: id,
        _creator: req.user.id
      }).then((contact) => {
        if (!contact) {
          return res.status(404).send();
        }

        return res.send({ contact });
      }, (e) => {
        return res.status(400).send();
      });
    }
  });

  app.patch('/contact/:id', requireAuth, (req, res) => {
    let { id } = req.params;
    let body = _.pick(req.body, ['name', 'details']);
    if (req.file) {
      body.photo = req.file.filename;
    }

    if (!ObjectID.isValid(id)) {
      return res.status(404).send();
    }

    Contact.findOneAndUpdate({
      _id: id,
      _creator: req.user.id
    }, { $set: body }, { new: true }).then((contact) => {
      if (!contact) {
        return res.status(404).send();
      }

      res.send({ contact });
    }).catch((e) => {
      res.status(400).send();
    });

  });

};
