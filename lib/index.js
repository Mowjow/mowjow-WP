'use strict';

var threeDs = require('3ds');

function Worldpay(options){
  this.threeDs = new threeDs(options);
}

module.exports = Worldpay;
