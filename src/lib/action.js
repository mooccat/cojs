'use strict';

// **todo**: find a coherent naming convention
// that do not clash with javascript keywods
// and remove all these useless calls 
// replace with `Action.prototype.finally = finally;`

// see [monad on wikipedia](https://en.wikipedia.org/wiki/Action_%28functional_programming%29)
// 
// A monad is an object (composable) that represent a piece of computation.
// the main way of composing it is the `bind` operator, that binds the 
// result of a piece of computation to a value, and calculate a new monad,
// i.e. 
// 
//      m.bind (function (x) { var n = new Action (...); return n; }
//  
// this expression evaluates to a new monad, that is the application of `m`,
// and then `n`. `n` could be parameterized on x, that is the value yielded by
// `m`.
//
// ***Action internals***
// 
// Our monad concrete type is a function that takes 3 arguments, a continuation
// to be called in case of sucess, a failure thunk in case of exception, and 
// a queue of the active coroutines, the result is a `Trampoline` object.
// the continuation take as arguments the value, the fail thunk and the queue of 
// acive coroutines, while the fail function takes the excpetion object, the 
// success thunk and again the queue of active coroutines.

var Trampoline = require ('./trampoline'),
    Queue = require ('./linkedListQueue');

var Action = function (take) {
  this.take = take;
};

var initial_continuation = function (v, fail, active) {
  if (active.empty()) {
    return new Trampoline(function () { return v; });
  }
  var next = active.deq();
  return next(active);
};

var initial_fail = function (e, cont, active) {
  throw e;
};

// ### run
// Actually run the monad. passing as initial continuation, a thunk that returns
// the actual value.
// the fail raises an exception back to the javascript world,
// and the third parameter is an empty queue.
// Actually this queue should be a functional object, but since the execution
// model makes this unique in any case, is not a problem using an ephemeral queue
// implementation, like the classical `LinkedListQueue`.
Action.prototype.run = function () {
  return this
    .take(initial_continuation, 
          initial_fail, 
          new Queue())
    .jump();
};

// ### Bind
// composes 2 monads
// var bind = function (m, next) {
//   return new Action (function (cont, fail, active) {
//     var _cont = function (v, _fail, _active) {
//       return new Trampoline(function () { 
//         return next(v).take(cont, _fail, _active); 
//       });
//     };
//     return m.take (_cont, fail, active);
//   });
// };

var bind = function (m, next) {
  return new Action (function (cont, fail, active) {
    return m.take (function (v, _fail, _active) {
      return new Trampoline(function () { 
        return next(v).take(cont, _fail, _active); 
      });
    }, fail, active);
  });
};


// ### Then
// composes 2 monads, ignoring parameter
//
//     a.then(b)
//
// is the same of 
// 
//     a.bind(function() { return b; })
// 
var then = function (m, n) {
  return new Action (function (cont, fail, active) {
    var _cont = function (v, _fail, _active) {
      return new Trampoline(function () { 
        return n.take(cont, _fail, _active); 
      });
    };
    return m.take (_cont, fail, active);
  });
};

// ### Error
// composes 2 monads alternativately, while bind imposes a sequential order, 
// the error operator composes 2 monads in parallel, if the first fails, the 
// second is executed (used to implement the `try{...} catch (e) {...}` block.
// var error = function (m, handler) {
//   return new Action (function (cont, fail, active) {
//     var _fail = function (err, _cont, _active) {
//       return new Trampoline(function () {
//         return handler(err).take (_cont, fail, _active);
//       });
//     };
//     return m.take(cont, _fail, active);
//   });
// };
var error = function (m, handler) {
  return new Action (function (cont, fail, active) {
    return m.take(cont, function (err, _cont, _active) {
      return new Trampoline(function () {
        return handler(err).take (_cont, fail, _active);
      });
    }, active);
  });
};

Action.prototype.bind = function (fun) {
  return bind (this, fun);
};

Action.prototype.then = function (action) {
  return then (this, action);
};

Action.prototype.error = function (fun) {
  return error (this, fun);
};

// ### Return
// 
// the argument is a function that is evaluated, the result is the value yielded
// by the action (like the `return` action in a monad). If some exception is 
// raised then the fail action is invoked.
var ret = function (fun) {
  return new Action (function (cont, fail, active) {
    return new Trampoline(function () {
      try {
	return cont (fun(), fail, active);
      } catch (e) {
	return fail (e, cont, active);
      }
    });
  });
};

// ### Return unboxed
// It's the same of return but the value is unboxed
// can be used to speedup the execution, if evaluating the content is not needed
var retU = function (v) {
  return new Action (function (cont, fail, active) {
    return new Trampoline(function () {
      return cont (v, fail, active);
    }); 
  }); 
};

// ### Undef(ined)
// simple constant action that returns undefined
var undef = retU();

// ### Fail
// Like ret instead it invokes the fail action. In case of exception the 
// exception is raised before raising the passed value.
var fail = function (fun) {
  return new Action (function (cont, fail, active) {
    return new Trampoline(function () {
      try {
        return fail (fun (), cont, active);
      } catch (e) {
        return fail (e, cont, active);
      }
    });
  });
};

// ### Fail Unboxed
// the same of fail except err is supposed to be an unboxed value
var failU = function (err) {
  return new Action (function (cont, fail, active) {
    return new Trampoline(function () {
      try {
        return fail (err, cont, active);
      } catch (e) {
        return fail (e, cont, active);
      }
    });
  });
};

// finally
Action.prototype.anyhow = function (clause) {
  return this.error(function (err) { 
    return clause.then(failU(err));
  }).bind (function (v) {
    return clause.then(retU(v));
  });
};

Action.ret = ret;
Action.retU = retU;

Action.fail = fail;
Action.failU = failU;

module.exports = Action;
