const organizeThreadReplies = (replies) => {
  var ret = {};
  ret.replies = JSON.parse(JSON.stringify(replies));
  ret.replycount = replies.length;
  ret.replies.sort((a, b) => b.created_on - a.created_on);
  ret.replies = ret.replies.slice(0, 3);
  for (var i = 0; i < ret.replies.length; i++) {
    delete ret.replies[i].delete_password;
    delete ret.replies[i].reported;
  }
  return ret;
}

const organizeThreads = (threads) => {
  var ret = JSON.parse(JSON.stringify(threads));
  ret.sort((a, b) => b.bumped_on - a.bumped_on);
  ret = ret.slice(0, 10);
  return ret;
}

module.exports = {
  organizeThreads,
  organizeThreadReplies
}