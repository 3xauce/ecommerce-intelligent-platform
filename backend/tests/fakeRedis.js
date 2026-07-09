/**
 * Mock du module config/redis pour les tests : file en mémoire.
 */
let queues = {};

const client = {
  isOpen: true,
  lPush: jest.fn(async (key, value) => {
    queues[key] = queues[key] || [];
    queues[key].unshift(value);
    return queues[key].length;
  }),
};

function reset() {
  queues = {};
  client.lPush.mockClear();
}

module.exports = {
  getRedisClient: async () => client,
  __reset: reset,
  __queues: () => queues,
};
