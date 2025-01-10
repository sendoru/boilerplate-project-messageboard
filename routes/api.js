'use strict';
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');

const { organizeThreadReplies, organizeThreads } = require('../utils/utils');

const SALT = process.env.SALT || 12;


module.exports = function (app, thread_collection, reply_collection) {

  app.route('/api/threads/:board')

    // get thread
    .get(async (req, res) => {
      console.log('GET /api/threads/:board');

      const board = req.params.board;
      thread_collection.find(
        { board: board },
        { projection: { delete_password: 0, reported: 0 } }
      ).toArray((err, data) => {
        if (err) {
          return res.json({ error: 'could not get threads' }).status(500);
        }
        // sort and limit threads
        data = organizeThreads(data);
        console.log(data);
        // sort and limit replies
        data.forEach((thread) => {
          const replies_data = organizeThreadReplies(thread.replies);
          thread.replies = replies_data.replies;
          thread.replycount = replies_data.replycount;
        });
        return res.json(data);
      });
    })

    // report thread
    .put(async (req, res) => {
      console.log('PUT /api/threads/:board');
      const board = req.params.board;
      const thread_id = req.body.thread_id;
      thread_collection.findOneAndUpdate(
        { _id: ObjectId(thread_id), board: board },
        { $set: { reported: true } },
        (err, data) => {
          if (err) {
            return res.json({ error: 'could not report thread' }).status(500);
          }
          if (!data.value) {
            return res.json({ error: 'thread not found' }).status(404);
          }
          res.send('reported');
        }
      )

      return res;
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
        created_on: new Date(),
        bumped_on: new Date(),
        reported: false,
        replies: []
      };

      console.log(thread);

      // save thread
      thread_collection.insertOne(thread, (err, data) => {
        if (err) {
          return res.json({ error: 'could not save thread' }).status(500);
        }
        return res.redirect(`/b/${board}`);
      });
      return res;
    })

    // delete thread
    .delete((req, res) => {
      console.log('DELETE /api/threads/:board');
      const board = req.params.board;
      const thread_id = req.body.thread_id;
      const delete_password = req.body.delete_password;

      thread_collection.findOne({ _id: ObjectId(thread_id) }, (err, data) => {
        if (err) {
          return res.json({ error: 'could not find thread' }).status(404);
        }
        if (!data) {
          return res.json({ error: 'thread not found' }).status(404);
        }
        if (!bcrypt.compareSync(delete_password, data.delete_password)) {
          return res.send('incorrect password').status(400);
        }
        thread_collection.deleteOne({ _id: ObjectId(thread_id) }, (err, data) => {
          if (err) {
            return res.json({ error: 'could not delete thread' }).status(500);
          }
          res.send('success')
        });
      });

      return res;
    });

  app.route('/api/replies/:board')
    // get replies
    .get((req, res) => {
      console.log('GET /api/replies/:board');

      const board = req.params.board;
      const thread_id = req.query.thread_id;

      thread_collection.find(
        { _id: ObjectId(thread_id), board: board },
        { projection: { delete_password: 0, reported: 0 } }
      ).toArray((err, data) => {
        if (err) {
          return res.json({ error: 'could not get replies' }).status(500);
        }
        if (!data[0]) {
          return res.json({ error: 'thread not found' }).status(404);
        }
        const thread = data[0];
        for (var i = 0; i < thread.replies.length; i++) {
          delete thread.replies[i].delete_password;
          delete thread.replies[i].reported;
        }
        return res.json(thread);
      });
    })

    // report reply
    .put((req, res) => {
      console.log('PUT /api/replies/:board');

      const board = req.params.board;
      const thread_id = req.body.thread_id;
      const reply_id = req.body.reply_id;

      thread_collection.findOne({ _id: ObjectId(thread_id) }, (err, data) => {
        if (err) {
          return res.json({ error: 'could not find thread' }).status(404);
        }
        if (!data) {
          return res.json({ error: 'thread not found' }).status(404);
        }
        const reply = data.replies.find((reply) => reply._id == reply_id);
        if (!reply) {
          return res.json({ error: 'reply not found' }).status(404);
        }
        reply.reported = true;
        thread_collection.findOneAndUpdate({ _id: data.id }, { $set: { replies: data.replies } }, (err, data) => {
          if (err) {
            return res.json({ error: 'could not report reply' }).status(500);
          }
          res.send('reported');
        });

      });

      return res;
    })

    // create reply
    .post((req, res) => {
      console.log('POST /api/replies/:board');

      // check required fields
      const board = req.params.board;
      const thread_id = req.body.thread_id;
      const text = req.body.text;
      // why tf front send this as plain text?
      const delete_password = req.body.delete_password;

      // create new reply
      const reply = {
        _id: new ObjectId(),
        text: text,
        delete_password: bcrypt.hashSync(delete_password, SALT),
        created_on: new Date(),
        reported: false
      };

      console.log(reply);

      // save thread
      thread_collection.findOneAndUpdate(
        { _id: ObjectId(thread_id), board: board },
        { $push: { replies: reply }, $set: { bumped_on: reply.created_on } },
        (err, data) => {
          if (err) {
            return res.json({ error: 'could not save reply' }).status(500);
          }
          if (!data.value) {
            return res.json({ error: 'thread not found' }).status(404);
          }
          return res.redirect(`/b/${board}/${thread_id}`);
        }
      );

      return res;
    })

    // delete reply
    .delete((req, res) => {
      console.log('DELETE /api/replies/:board');

      const thread_id = req.body.thread_id;
      const reply_id = req.body.reply_id;
      const delete_password = req.body.delete_password;

      thread_collection.findOne({ _id: ObjectId(thread_id) }, (err, data) => {
        if (err) {
          return res.json({ error: 'could not find thread' }).status(404);
        }
        if (!data) {
          return res.json({ error: 'thread not found' }).status(404);
        }
        const reply = data.replies.find((reply) => reply._id == reply_id);
        if (!reply) {
          return res.json({ error: 'reply not found' }).status(404);
        }
        if (!bcrypt.compareSync(delete_password, reply.delete_password)) {
          return res.send('incorrect password').status(400);
        }
        data.replies = data.replies.map((reply) => { if (reply._id == reply_id) { reply.text = '[deleted]' }; return reply; });
        console.log(data);
        thread_collection.findOneAndUpdate({ _id: data._id }, { $set: { replies: data.replies } }, (err, data) => {
          if (err) {
            return res.json({ error: 'could not delete reply' }).status(500);
          }
          res.send('success');
        });
      });

      return res;
    });

};
