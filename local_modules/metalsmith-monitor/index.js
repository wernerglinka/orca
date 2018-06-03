plugin = () => {
    return (files, metalsmith, done) => {
      //console.log(metalsmith.metadata());
      //console.log(files);
      var n;
      for (n = 0; n < 20000000000; n++) {};
      console.log(n);
      done();
    };
};

module.exports = plugin;