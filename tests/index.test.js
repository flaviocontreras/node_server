const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { server } = require('../index');
const { Todo } = require('../models/todo');
const { User } = require('../models/user');
const { todos, populateTodos, users, populateUsers } = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);

describe('POST /todos', () => {
  it('should create a new todo', (done) => {
    var text = 'Run tests';

    request(server)
      .post('/todos')
      .set('authorization', users[0].token)
      .send({ text })
      .expect(200) // test status of request
      .expect((res) => {
        expect(res.body.text).toBe(text);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.find({text}).then((todos) => {
          expect(todos.length).toBe(1);
          expect(todos[0].text).toBe(text);
          done();
        }).catch((e) => done(e));

      });
  });

  it('should not create todo with invalid body data', (done) => {
    request(server)
      .post('/todos')
      .set('authorization', users[0].token)
      .send({})
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.find().then((todos) => {
          expect(todos.length).toBe(2);
          done();
        }).catch((e) => done(e));
      });
  });

});

describe('GET /todos', () => {
  it('should get all todos', (done) => {
    request(server)
      .get('/todos')
      .set('authorization', users[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todos.length).toBe(1);
      })
      .end(done);
  });
});

describe('GET /todos/:id', () => {
  it('should return todo doc', (done) => {
    request(server)
      .get(`/todos/${todos[0]._id.toHexString()}`)
      .set('authorization', users[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(todos[0].text);
      })
      .end(done);
  });

  it('should not return todo doc created by other user', (done) => {
    request(server)
      .get(`/todos/${todos[1]._id.toHexString()}`)
      .set('authorization', users[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 if todo not found', (done) => {
    let id = new ObjectID;
    request(server)
      .get(`/todos/${id.toHexString()}`)
      .set('authorization', users[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 for non-object ids', (done) => {
    request(server)
      .get(`/todos/123`)
      .set('authorization', users[0].token)
      .expect(404)
      .end(done);
  });

});

describe('DELETE /todos/:id', () => {
  it('should remove a todo', (done) => {
    var hexId = todos[1]._id.toHexString();

    request(server)
      .delete(`/todos/${hexId}`)
      .set('authorization', users[1].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.todo._id).toBe(hexId);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        // query database using findById
        Todo.findById(hexId).then((todo) => {
          expect(todo).toNotExist();
          done();
        }).catch((e) => done(e))
      })
  });

  it('should not remove a todo not created by the user', (done) => {
    var hexId = todos[0]._id.toHexString();

    request(server)
      .delete(`/todos/${hexId}`)
      .set('authorization', users[1].token)
      .expect(404)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Todo.findById(hexId).then((todo) => {
          expect(todo).toExist();
          done();
        }).catch((e) => done(e))
      })
  });

  it('should return 404 if todo not found', (done) => {
    var hexId = new ObjectID().toHexString();

    request(server)
      .delete(`/todos/${hexId}`)
      .set('authorization', users[1].token)
      .expect(404)
      .end(done);

  });

  it('should return 404 if object id is invalid', (done) => {
    request(server)
      .delete(`/todos/123abc`)
      .set('authorization', users[1].token)
      .expect(404)
      .end(done);
  });
});

describe('PATCH /todos/:id', () => {
  it('should update the todo', (done) => {
    let hexId = todos[0]._id.toHexString();
    let text = "New text";

    request(server)
      .patch(`/todos/${hexId}`)
      .set('authorization', users[0].token)
      .send({
        completed: true,
        text
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(text);
        expect(res.body.todo.completed).toBe(true);
        expect(res.body.todo.completedAt).toBeA('number');
      })
      .end(done);
  });

  it('should not update the todo not created by the user', (done) => {
    let hexId = todos[1]._id.toHexString();
    let text = "New text";

    request(server)
      .patch(`/todos/${hexId}`)
      .set('authorization', users[0].token)
      .send({
        completed: true,
        text
      })
      .expect(404)
      .end(done);
  });

  it('should clear completedAt when todo is not completed', (done) => {
    let hexId = todos[1]._id.toHexString();
    let text = "Another new text";

    request(server)
      .patch(`/todos/${hexId}`)
      .set('authorization', users[1].token)
      .send({
        completed: false,
        text
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.todo.text).toBe(text);
        expect(res.body.todo.completed).toBe(false);
        expect(res.body.todo.completedAt).toNotExist();
      })
      .end(done);
  });
});

describe('GET /', () => {

  it('should return secret message if authenticated', (done) => {
    let secretMessage = 'Super secret code is ABC123';

    request(server)
      .get('/')
      .set('authorization', users[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toEqual(secretMessage);
      })
      .end(done);
  });

  it('should return 401 if not authenticated', (done) => {
    request(server)
      .get('/')
      .set('authorization', '123')
      .expect(401)
      .end(done);
  });

});

describe('POST /signin', () => {

   it('should login user and return auth token', (done) => {
     request(server)
      .post('/signin')
      .send({ email: users[0].email, password: users[0].password })
      .expect(200)
      .expect((res) => {
        expect(res.body.token).toExist();
      })
      .end(done);
   });

    it('should reject invalid login', (done) => {
      request(server)
       .post('/signin')
       .send({ email: users[0].email, password: 'invalidPassword' })
       .expect(401)
       .end(done);
    });
});

describe('POST /signup', () => {
  // app.post('/signup', Authentication.signup);
  it('should create a user and return a token', (done) => {
    let email = 'newuser@example.com';
    let password = '123newuser';

    request(server)
      .post('/signup')
      .send({ email, password })
      .expect(200)
      .expect((res) => {
        expect(res.body.token).toExist();
      })
      .end(done);
  });

  it('should return validation errors if request invalid', (done) => {
    let email = 'newuser@example.com';
    let password = '123newuser';

    request(server)
      .post('/signup')
      .send({ email })
      .expect(422)
      .expect((res) => {
        expect(res.body.error).toBe('You must provide email and password');
      })
      .end(done);
  });

  it('should not create user if email in use', (done) => {
    request(server)
      .post('/signup')
      .send({ email: users[0].email, password: '123' })
      .expect(422)
      .expect((res) => {
        expect(res.body.error).toBe('Email is in use');
      })
      .end(done);
  });
});
