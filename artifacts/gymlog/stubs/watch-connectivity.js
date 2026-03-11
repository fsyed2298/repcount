const noOp = () => {};
const noOpSub = () => () => {};

const WatchConnectivity = {
  getReachability: () => Promise.resolve(false),
  sendMessage: noOp,
  watchEvents: {
    on: noOpSub,
  },
};

module.exports = WatchConnectivity;
module.exports.default = WatchConnectivity;
