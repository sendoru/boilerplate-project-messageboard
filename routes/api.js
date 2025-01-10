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
        // add reply datas
        let error = false;
        data.forEach(thread => {
          reply_collection.find(
            { board: board, thread_id: thread._id },
            { projection: { delete_password: 0, reported: 0 } }
          ).toArray((err, replies) => {
            if (err) {
              error = true;
            }
            const replies_data = organizeThreadReplies(replies);
            thread.replies = replies_data.replies;
            thread.replycount = replies_data.replycount;
          });
        });
        if (error) {
          return res.json({ error: 'could not get replies' }).status(500);
        }
        res.json(data);
      })
      return res;
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
          res.json({ success: 'thread reported' });
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
        reported: false
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
      if (!board || !thread_id || !delete_password) {
        return res.json({ error: 'missing required fields' }).status(400);
      }
      thread_collection.findOne({ _id: ObjectId(thread_id) }, (err, data) => {
        if (err) {
          return res.json({ error: 'could not find thread' }).status(404);
        }
        if (!data) {
          return res.json({ error: 'thread not found' }).status(404);
        }
        if (!bcrypt.compareSync(delete_password, data.delete_password)) {
          return res.json({ error: 'incorrect password' }).status(400);
        }
        thread_collection.deleteOne({ _id: ObjectId(thread_id) }, (err, data) => {
          if (err) {
            return res.json({ error: 'could not delete thread' }).status(500);
          }
          res.json({ success: 'thread deleted' });
        });
      });

      return res;
    });

  app.route('/api/replies/:board')
    // get replies
    .get((req, res) => {
      const board = req.params.board;
      const thread_id = req.query.thread_id;
      if (!board || !thread_id) {
        return res.json({ error: 'missing required fields' }).status(400);
      }
      reply_collection.find(
        { board: board, thread_id: thread_id },
        { projection: { delete_password: 0, reported: 0 } }
      ).toArray((err, data) => {
        if (err) {
          return res.json({ error: 'could not get replies' }).status(500);
        }
        res.json(data);
      });

      return res;
    })

    // report reply
    .put((req, res) => {


      return res;
    })

    // create reply
    .post((req, res) => {
      // check required fields
      const board = req.params.board;
      const thread_id = req.body.thread_id;
      const text = req.body.text;
      // why tf front send this as plain text?
      const delete_password = req.body.delete_password;
      if (!board || !thread_id || !text || !delete_password) {
        return res.json({ error: 'missing required fields' }).status(400);
      }

      // create new thread
      const reply = {
        board: board,
        text: text,
        delete_password: bcrypt.hashSync(delete_password, SALT),
        created_on: new Date(),
        reported: false
      };

      console.log(reply);

      // save thread
      thread_collection.insertOne(reply, (err, data) => {
        if (err) {
          return res.json({ error: 'could not save reply' }).status(500);
        }
        res.redirect(`/b/${board}/${thread_id}`);
      });

      return res;
    })

    // delete reply
    .delete((req, res) => { });

};
