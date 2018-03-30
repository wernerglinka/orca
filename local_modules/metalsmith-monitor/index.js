plugin = () => {
    return (files, metalsmith, done) => {
      console.log(metalsmith.metadata());
      done();
    };
};

module.exports = plugin;