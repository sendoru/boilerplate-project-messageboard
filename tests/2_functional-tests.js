const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
  let thread_id = '';
  let reply_id = '';
  // Creating a new thread: POST request to /api/threads/{board}
  (function () {
    test('Creating a new thread', function (done) {
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'test thread',
          delete_password: 'password'
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.redirects.length, 1);
          chai.request(server)
            .get('/api/threads/test')
            .end(function (err, res) {
              thread_id = res.body[0]._id;
            })
          done();
        });
    });
  }());

  // Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}
  (function () {
    test('Viewing the 10 most recent threads with 3 replies each', function (done) {
      chai.request(server)
        .get('/api/threads/test')
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body);
          assert.isAtMost(res.body.length, 10);
          done();
        });
    });
  }());

  // Reporting a thread: PUT request to /api/threads/{board}
  (function () {
    test('Reporting a thread', function (done) {
      chai.request(server)
        .put('/api/threads/test')
        .send({
          thread_id: thread_id
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'reported');
          done();
        });
    });
  }());

  // Creating a new reply: POST request to /api/replies/{board}
  (function () {
    test('Creating a new reply', function (done) {
      chai.request(server)
        .post('/api/replies/test')
        .send({
          thread_id: thread_id,
          text: 'test reply',
          delete_password: 'password'
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.redirects.length, 1);
          chai.request(server)
            .get('/api/replies/test')
            .query({
              thread_id: thread_id
            })
            .end(function (err, res) {
              reply_id = res.body.replies[0]._id;
            });
          done();
        });
    });
  }());

  // Viewing a single thread with all replies: GET request to /api/replies/{board}
  (function () {
    test('Viewing a single thread with all replies', function (done) {
      chai.request(server)
        .get('/api/replies/test')
        .query({
          thread_id: thread_id
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isObject(res.body);
          assert.property(res.body, 'replies');
          assert.isArray(res.body.replies);
          done();
        });
    });
  }());
  // Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password
  (function () {
    test('Deleting a reply with the incorrect password', function (done) {
      chai.request(server)
        .delete('/api/replies/test')
        .send({
          thread_id: thread_id,
          reply_id: reply_id,
          delete_password: 'wrongpassword'
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'incorrect password');
          done();
        });
    })
  }());
  // Reporting a reply: PUT request to /api/replies/{board}
  (function () {
    test('Reporting a reply', function (done) {
      chai.request(server)
        .put('/api/replies/test')
        .send({
          thread_id: thread_id,
          reply_id: reply_id
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'reported');
          done();
        });
    });
  }());
  // Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password
  (function () {
    test('Deleting a reply with the incorrect password', function (done) {
      chai.request(server)
        .delete('/api/replies/test')
        .send({
          thread_id: thread_id,
          reply_id: reply_id,
          delete_password: 'password'
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
    })
  }());

  // Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password
  (function () {
    test('Deleting a thread with the incorrect password', function (done) {
      chai.request(server)
        .delete('/api/threads/test')
        .send({
          thread_id: thread_id,
          delete_password: 'wrongpassword'
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'incorrect password');
          done();
        });
    });
  }());

  // Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password
  (function () {
    test('Deleting a thread with the correct password', function (done) {
      chai.request(server)
        .delete('/api/threads/test')
        .send({
          thread_id: thread_id,
          delete_password: 'password'
        })
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
    });
  }());
});
