var async = require ('./src/index.js');

// var m = 10000, n = 0, ch = async.chan();

// go {
//     while (n < m) {
//       send n -> ch;
//       n++;
//     }
// };

// go do {
//     recv v <- ch;
//     console.log ('new number: ' + v);
// } while (true);

go {
  try {
    throw "ciao";
    console.log ('x');
  } catch (e) {
    console.log ('eddor:');
    console.log (e);
  }
  console.log ('end');
}
