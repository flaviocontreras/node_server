const _ = require('lodash');
const Authentication = require('../controllers/authentication');
const passportService = require('../services/passport');
const passport = require('passport');
const { Todo } = require('../models/todo');
const { ObjectID } = require('mongodb');

// session false indicates to not create a cookie based session
const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignin = passport.authenticate('local', { session: false });

module.exports = function(app) {
  app.post('/todos', requireAuth, (req, res) => {
    var todo = new Todo({
      text: req.body.text,
      _creator: req.user._id
    });

    todo.save().then((doc) => {
      res.send(doc);
    }, (e) => {
      res.status(400).send(e);
    })
  });

  app.get('/todos', requireAuth, (req, res) => {

    Todo.find({
      _creator: req.user._id
    }).then((todos) => {
      res.send({ todos });
    }, (e) => {
      res.status(400).send(e);
    });

  });

  app.get('/todos/:id', requireAuth, (req, res) => {
    var { id } = req.params;
    // Valid id using isValid
    if (!ObjectID.isValid(id)){
      return res.status(404).send();
    } else {
      Todo.findOne({
        _id: id,
        _creator: req.user.id
      }).then((todo) => {
        if (!todo) {
          return res.status(404).send();
        } else {
          return res.send({ todo });
        }

      }, (e) => {
        return res.status(400).send();
      })
    }
  });

  app.delete('/todos/:id', requireAuth, (req, res) => {
    var { id } = req.params;
    if (!ObjectID.isValid(id)) {
      return res.status(404).send();
    } else {
      Todo.findOneAndRemove({
        _id: id,
        _creator: req.user.id
      }).then((todo) => {
        if (!todo) {
          return res.status(404).send();
        }

        res.send({ todo });

      }).catch((e) => {
        res.status(400).send();
      });
    }
  });

  app.patch('/todos/:id', requireAuth, (req, res) => {
    let { id } = req.params;
    let body = _.pick(req.body, ['text', 'completed']);

    if (!ObjectID.isValid(id)) {
      return res.status(404).send();
    }

    if (_.isBoolean(body.completed) && body.completed) {
      body.completedAt = new Date().getTime();
    } else {
      body.completed = false;
      body.completedAt = null;
    }

    Todo.findOneAndUpdate({
      _id: id,
      _creator: req.user.id
    }, { $set: body }, { new: true }).then((todo) => {
      if (!todo) {
        return res.status(404).send();
      }

      res.send({ todo });
    }).catch((e) => {
      res.status(400).send();
    });

  });
};
