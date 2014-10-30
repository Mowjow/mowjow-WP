'use strict';
var SoapClient = {};

/**
 * @description Handles all interaction with the Envoy Transfer API
 * @param options
 * @constructor
 */
function EnvoyTransfers(options) {
  var baseUrl = options.isTest ? 'https://test.envoytx.com/MerchantAPI.asmx' : 'https://www.envoytx.com/MerchantAPI.asmx';
  this.username = options.username;
  this.password = options.password;
  this.baseUrl = options.baseUrl || baseUrl;
}

/**
 * @param method
 * @param params
 * @param {function(err, results, response)} cb
 * @return {*}
 */
EnvoyTransfers.prototype.__envoyApiCall = function __envoyApiCall(method, params, cb) {
  // here come the pain of soap
  var $client = new SoapClient(this.baseUrl + '?WSDL');
  //query for results
  return $client[method](params, cb); //Todo:: change this
  //Todo:: make sure that you are handinglig error properly before returning data
};

/**
 * @param {string} countryCode
 * @param {function(err, results, response)} cb
 * @return {*}
 */
  //using V2 API
EnvoyTransfers.prototype.getBankDetails = function getBankDetails(countryCode, cb) {
  return this.__envoyApiCall('getBankDetailsV2', {
    'auth': {
      'username': this.username,
      'password': this.password
    },
    'country': countryCode
  }, cb);
};

/**
 * @param {object} options
 * @param {function(err, results, response)} cb
 * @return {*}
 */
EnvoyTransfers.prototype.payToBankAccount = function payToBankAccount(options, cb) { //using V2 API
  return this.__envoyApiCall('payToBankAccountV2', {
    'auth': {
      'username': this.username,
      'password': this.password
    },
    'requestReference': options.requestReference,
    'paymentInstructions': {
      'paymentInstructionV2': {
        'paymentDetails': {
          'countryCode': options.countryCode,
          'payee': options.payee,
          'sourceCurrency': 'EUR',
          'sourceAmount': options.sourceAmount,
          'targetCurrency': options.targetCurrency,
          'targetAmount': options.targetAmount, //only needed when using T as sourceOrTarget

          'sourceOrTarget': 'S'
          //'merchantReference' : $params.merchantReference,
          //'paymentReference' : $params.paymentReference,
        },
        'bankDetails': {
          'accountNumber': options.accountNumber,
          'bankName': options.bankName,
          'checkDigits': options.checkDigits,
          //'bankCode'      : $params.bankCode,
          //'branchCode'    : $params.branchCode,
          'branchAddress': options.branchAddress,
          //'accountType'   : $params.accountType,
          //'iban'          :  $params.iban,
          'swift': options.swift,
          'fastPayment': 'Y'
        }
      }
    }
  }, cb);
};

/**
 * @param requestReference
 * @desc Poll for new paymet at a certain interval. Its not needed if you are using notification
 * listener which is a better method.
 * @param {function(err, results, response)} cb
 * @return {*}
 */
EnvoyTransfers.prototype.pollPayment = function pollPayment(requestReference, cb) {
  return this.__envoyApiCall('pollPayments', {
    'auth': {
      'username': this.username,
      'password': this.password
    },
    'requestReference': requestReference
  }, cb);
};

/**
 *
 * @desc validate a payin request notification to the notification listener
 * @param {string} epacs
 * @param {function(err, results, response)} cb
 * @return {*}
 */
EnvoyTransfers.prototype.paymentConfirmation = function paymentConfirmation(epacs, cb) { //using v2 api
  return this.__envoyApiCall('payInConfirmationV2', {
    'auth': {
      'username': this.username,
      'password': this.password
    },
    'epacsReference': epacs
  }, cb);
};

module.exports = EnvoyTransfers;