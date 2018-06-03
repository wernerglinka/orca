plugin = (message) => {
    return (files, metalsmith, done) => {
      console.log(message);
      done();
    };
};

module.exports = plugin;