const { ObjectID } = require('mongodb');
const jwt = require('jwt-simple');

const { Todo } = require('../../models/todo');
const { User } = require('../../models/user');

const USER_ONE_ID = new ObjectID();
const USER_TWO_ID = new ObjectID();

// Create tokens used for auth in requests
const timestamp = new Date().getTime();
const USER_ONE_TOKEN = jwt.encode({ sub: USER_ONE_ID, iat: timestamp }, process.env.JWT_SECRET);
const USER_TWO_TOKEN = jwt.encode({ sub: USER_TWO_ID, iat: timestamp }, process.env.JWT_SECRET);

const users = [
  {
    _id: USER_ONE_ID,
    email: 'flavio@example.com',
    password: 'userOnePass',
    token: USER_ONE_TOKEN
  }, {
    _id: USER_TWO_ID,
    email: 'johndoe@example.com',
    password: 'userTwoPass',
    token: USER_TWO_TOKEN
  }
];

const todos = [
  {
    _id: new ObjectID(),
    text: 'First test todo',
    _creator: USER_ONE_ID
  },
  {
    _id: new ObjectID(),
    text: 'Second test todo',
    completed: true,
    completedAt: 123,
    _creator: USER_TWO_ID
  }
];

const populateUsers = (done) => {
  User.remove({}).then(() => {
    var userOne = new User(users[0]).save();
    var userTwo = new User(users[1]).save();

    return Promise.all([userOne, userTwo]);
  }).then(() => done());
};

const populateTodos = (done) => {
  Todo.remove({}).then(() => {
    return Todo.insertMany(todos);
  }).then(() => done());
};

module.exports = {
  todos,
  populateTodos,
  users,
  populateUsers
}
