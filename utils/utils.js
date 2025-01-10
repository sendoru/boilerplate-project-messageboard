const organizeThreadReplies = (thread) => {
  var ret = JSON.parse(JSON.stringify(thread));
  ret.replycount = thread.replies.length;
  ret.replies.sort((a, b) => b.created_on - a.created_on);
  ret.replies = thread.replies.slice(0, 3);
  return ret;
}

const organizeThreads = (threads) => {
  var ret = JSON.parse(JSON.stringify(threads));
  ret.sort((a, b) => b.bumped_on - a.bumped_on);
  ret = ret.slice(0, 10);
  ret.forEach(thread => {
    thread = organizeThreadReplies(thread);
  });
  return ret;
}

module.exports = {
  organizeThreads,
  organizeThreadReplies
}