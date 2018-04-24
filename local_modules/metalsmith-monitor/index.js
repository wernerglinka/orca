plugin = () => {
    return (files, metalsmith, done) => {
      console.log(metalsmith.metadata());
      //console.log(files);
      done();
    };
};

module.exports = plugin;