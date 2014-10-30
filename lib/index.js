'use strict';

var ThreeDs = require('./3ds');
var EnvoyTransfers = require('./envoyTransfers');

function Worldpay(options){
  this.threeDs = new ThreeDs(options);
  this.envoyTransfers = new EnvoyTransfers(options);
}

module.exports = Worldpay;
