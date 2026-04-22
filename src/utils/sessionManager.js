const sessions = {};

exports.set = (id, data) => {
  sessions[id] = data;
};

exports.get = (id) => {
  return sessions[id] || {};
};

exports.clear = (id) => {
  delete sessions[id];
};
