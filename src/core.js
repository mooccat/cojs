// This is the other entry point of the gozilla lib, but this one is 
// automatically required by `gozilla/macros`. The end user doesn't have to be
// aware of this.
// 
// This module exposes the 2 core actions that can be taken in a monad, i.e. 
// ret(urn) and fail (the others are send and recv, that are generated by the 
// `send` and `recv` methods in `BufferedChannel` or `UnbufferedChannel`). 
// 
// Both of these are supposed to have as argument a function that is evaluated. 
// In this way if the thunk raises an exception, it is correctly handled.

var Monad = require ('./monad'),
    Jump = require ('./jump');

// ### Return
// 
// the argument is a function that is evaluated, the result is the value yielded
// by the action (like the `return` action in a monad). If some exception is 
// raised then the fail action is invoked.
var ret = function (fun) {
  return new Monad (function (cont, fail, scheduler) {
    return new Jump(function () {
      try {
	return cont (fun(), fail, scheduler);
      } catch (e) {
	return fail (e, cont, scheduler);
      }
    });
  });
};
// ### Fail
// Like ret instead it invokes the fail action. In case of exception the 
// exception is raised before raising the passed value.
var fail = function (fun) {
  return new Monad (function (cont, fail, scheduler) {
    return new Jump(function () {
      try {
        return fail (fun (), cont, scheduler);
      } catch (e) {
        return fail (e, cont, scheduler);
      }
    });
  });
};

module.exports = {
  ret: ret,
  fail: fail
};
