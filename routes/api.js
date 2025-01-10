'use strict';
const bcrypt = require('bcrypt')

const SALT = process.env.SALT || 12;

module.exports = function (app, collection) {

  app.route('/api/threads/:board')

    // get thread
    .get((req, res) => {
      console.log('GET /api/threads/:board');

      const board = req.params.board;
      collection.find({ board: board }).toArray((err, data) => {
        if (err) {
          return res.json({ error: 'could not get threads' }).status(500);
        }
        // sort by bumped_on
        data.sort((a, b) => b.bumped_on - a.bumped_on);
        // get only 10 most recent threads
        data = data.slice(0, 10);
        // get only 3 most recent replies for each thread
        data.forEach(thread => {
          thread.replycount = thread.replies.length;
          thread.replies.sort((a, b) => b.created_on - a.created_on);
          thread.replies = thread.replies.slice(0, 3);
        });
        res.json(data);
      });
    })

    // report thread
    .put((req, res) => {
      console.log('PUT /api/threads/:board');
      const board = req.params.board;
      const thread_id = req.body.thread_id;
      collection.findOneAndUpdate(
        { _id: ObjectId(thread_id), board: board },
        { $set: { reported: true } },
        (err, data) => {
          if (err) {
            return res.json({ error: 'could not report thread' }).status(500);
          }
          if (!data.value) {
            return res.json({ error: 'thread not found' }).status(404);
          }
          res.json({ success: 'thread reported' });
        }
      )
    })

    // create thread
    .post((req, res) => {
      console.log('POST /api/threads/:board');

      // check required fields
      const board = req.params.board;
      const text = req.body.text;
      // why tf front send this as plain text?
      const delete_password = req.body.delete_password;
      if (!board || !text || !delete_password) {
        return res.json({ error: 'missing required fields' }).status(400);
      }

      // create new thread
      const thread = {
        board: board,
        text: text,
        delete_password: bcrypt.hashSync(delete_password, SALT),
        replies: [],
        created_on: new Date(),
        bumped_on: new Date(),
        reported: false
      };

      console.log(thread);

      // save thread
      collection.insertOne(thread, (err, data) => {
        if (err) {
          return res.json({ error: 'could not save thread' }).status(500);
        }
        res.redirect(`/b/${board}`);
      });
    })

    // delete thread
    .delete((req, res) => {
      console.log('DELETE /api/threads/:board');
      const board = req.params.board;
      const thread_id = req.body.thread_id;
      const delete_password = req.body.delete_password;
      if (!board || !thread_id || !delete_password) {
        return res.json({ error: 'missing required fields' }).status(400);
      }
      collection.findOne({ _id: ObjectId(thread_id) }, (err, data) => {
        if (err) {
          return res.json({ error: 'could not find thread' }).status(404);
        }
        if (!data) {
          return res.json({ error: 'thread not found' }).status(404);
        }
        if (!bcrypt.compareSync(delete_password, data.delete_password)) {
          return res.json({ error: 'incorrect password' }).status(400);
        }
        collection.deleteOne({ _id: ObjectId(thread_id) }, (err, data) => {
          if (err) {
            return res.json({ error: 'could not delete thread' }).status(500);
          }
          res.json({ success: 'thread deleted' });
        });
      });
    });

  app.route('/api/replies/:board');

};
