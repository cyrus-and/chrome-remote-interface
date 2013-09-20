var ChromeInterface = require('../index.js');
ChromeInterface(function(chrome) {

  var repl = require('repl');

  var c = repl.start({
    prompt: 'chrome> '
  }).context;

  for (domain in chrome)
    c[domain] = chrome[domain];
  
   console.log(chrome);

});
