'use strict';

var fs = require('fs'),
    with_mvar = require ('./with_mvar');

var spit = function (path, data, options) {
  return with_mvar(function (mv) {
    fs.writeFile(path, data, options, function (err) {
      if (! err) {
      fork { mv ~> true ; }
      }
    });
  });
};

module.exports = spit;
