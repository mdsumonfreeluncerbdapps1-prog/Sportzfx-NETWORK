const sessions = {};

exports.get = (id) => sessions[id];
exports.set = (id, data) => sessions[id] = data;
exports.clear = (id) => delete sessions[id];
