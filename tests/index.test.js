const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { server } = require('../index');
const { Todo } = require('../models/todo');
const { Contact } = require('../models/contact');
const { User } = require('../models/user');
const { todos, populateTodos, users, populateUsers, contacts, populateContacts } = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);
beforeEach(populateContacts);

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
//   // app.post('/signup', Authentication.signup);
//   it('should create a user and return a token', (done) => {
//     let email = 'newuser@example.com';
//     let password = '123newuser';
//
//     request(server)
//       .post('/signup')
//       .send({ email, password })
//       .expect(200)
//       .expect((res) => {
//         expect(res.body.token).toExist();
//       })
//       .end(done);
//   });
//
//   it('should return validation errors if request invalid', (done) => {
//     let email = 'newuser@example.com';
//     let password = '123newuser';
//
//     request(server)
//       .post('/signup')
//       .send({ email })
//       .expect(422)
//       .expect((res) => {
//         expect(res.body.error).toBe('You must provide email and password');
//       })
//       .end(done);
//   });
//
//   it('should not create user if email in use', (done) => {
//     request(server)
//       .post('/signup')
//       .send({ email: users[0].email, password: '123' })
//       .expect(422)
//       .expect((res) => {
//         expect(res.body.error).toBe('Email is in use');
//       })
//       .end(done);
//   });
// });

describe('POST /contact', () => {
  it('should create a new contact', (done) => {
    var contact = {
      name: "John Doe",
      details: "Test"
    };

    request(server)
      .post('/contact')
      .set('authorization', users[0].token)
      .send(contact)
      .expect(200) // test status of request
      .expect((res) => {
        expect(res.body.name).toBe(contact.name);
        expect(res.body.details).toBe(contact.details);
        expect(res.body._creator).toExist();
        expect(res.body.photo).toExist();
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        Contact.find().then((contacts) => {
          expect(contacts.length).toBe(3);
          done();
        }).catch((e) => done(e));
      });
  });

  it('should not create contact with invalid body data', (done) => {
    request(server)
      .post('/contact')
      .set('authorization', users[0].token)
      .send({})
      .expect(400)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        Contact.find().then(contacts => {
          expect(contacts.length).toBe(2);
          done();
        }).catch(e => done(e));
      });
  });
});

describe('GET /contact', () => {
  it('should get all contacts for auth user', (done) => {
    request(server)
      .get('/contact')
      .set('authorization', users[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.contacts.length).toBe(1);
      })
      .end(done);
  });
});

describe('GET /contact/:id', () => {
  it('should return contact doc', (done) => {
    request(server)
      .get(`/contact/${contacts[0]._id.toHexString()}`)
      .set('authorization', users[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.contact.name).toBe(contacts[0].name);
        expect(res.body.contact.details).toBe(contacts[0].details);
        expect(res.body.contact.photo).toBe(contacts[0].photo);
      })
      .end(done);
  });

  it('should not return contact created by other user', (done) => {
    request(server)
      .get(`/contact/${contacts[1]._id.toHexString()}`)
      .set('authorization', users[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 if contact not found', (done) => {
    let id = new ObjectID();

    request(server)
      .get(`/contact/${id.toHexString()}`)
      .set('authorization', users[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 for non-object ids', (done) => {
    request(server)
      .get('/contact/123')
      .set('authorization', users[0].token)
      .expect(404)
      .end(done);
  });

});

describe('DELETE /contact/:id', () => {
  it('should remove a contact', (done) => {
    let id = contacts[0]._id.toHexString();

    request(server)
      .delete(`/contact/${id}`)
      .set('authorization', users[0].token)
      .expect(200)
      .expect((res) => {
        expect(res.body.contact._id).toBe(id);
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Contact.findById(id).then((contact) => {
          expect(contact).toNotExist();
          done();
        }).catch(e => done(e));
      });
  });

  it('should not remove a contact not created by the user', (done) => {
    let id = contacts[0]._id.toHexString();

    request(server)
      .delete(`/contact/${id}`)
      .set('authorization', users[1].token)
      .expect(404)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        Contact.findById(id).then((contact) => {
          expect(contact).toExist();
          done();
        }).catch(e => done(e));
      });
  });

  it('should return 404 if contact not found', (done) => {
    let id = new ObjectID();

    request(server)
      .delete(`/contact/${id}`)
      .set('authorization', users[0].token)
      .expect(404)
      .end(done);
  });

  it('should return 404 if object id is invalid', (done) => {
    request(server)
      .delete('/contact/123')
      .set('authorization', users[0].token)
      .expect(404)
      .end(done);
  });

});

describe('PATCH /contact/:id', () => {
  it('should update the contact', (done) => {
    let id = contacts[0]._id.toHexString();
    let details = 'New Details';

    request(server)
      .patch(`/contact/${id}`)
      .set('authorization', users[0].token)
      .send({ details })
      .expect(200)
      .expect((res) => {
        expect(res.body.contact.name).toBe(contacts[0].name);
        expect(res.body.contact.details).toBe(details);
      })
      .end(done);
  });

  it('should not update the contact not created by the user', (done) => {
    let id = contacts[1]._id.toHexString();
    let details = "New details";

    request(server)
      .patch(`/contact/${id}`)
      .set('authorization', users[0].token)
      .send({ details })
      .expect(404)
      .end(done);
  });


});


//
//   it('should not update the todo not created by the user', (done) => {
//     let hexId = todos[1]._id.toHexString();
//     let text = "New text";
//
//     request(server)
//       .patch(`/todos/${hexId}`)
//       .set('authorization', users[0].token)
//       .send({
//         completed: true,
//         text
//       })
//       .expect(404)
//       .end(done);
//   });
//
//   it('should clear completedAt when todo is not completed', (done) => {
//     let hexId = todos[1]._id.toHexString();
//     let text = "Another new text";
//
//     request(server)
//       .patch(`/todos/${hexId}`)
//       .set('authorization', users[1].token)
//       .send({
//         completed: false,
//         text
//       })
//       .expect(200)
//       .expect((res) => {
//         expect(res.body.todo.text).toBe(text);
//         expect(res.body.todo.completed).toBe(false);
//         expect(res.body.todo.completedAt).toNotExist();
//       })
//       .end(done);
//   });
// });
//
