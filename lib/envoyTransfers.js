'use strict';

/**
 * @description Handles all interaction with the Envoy Transfer API
 * @param options
 * @constructor
 */
function EnvoyTransfers(options) {
  var soap = require('soap');

  var baseUrl = options.isTest ? 'https://test.envoytx.com/MerchantAPI.asmx?wsdl' : 'https://www.envoytx.com/MerchantAPI.asmx?wsdl';
  this.username = options.envoytx_username;
  this.password = options.envoytx_password;
  this.baseUrl = options.baseUrl || baseUrl;

  var self = this;
  var soapClient = null;

  this.createClient = function (next) {
    if (soapClient) {
      return next(null, soapClient);
    }

    return soap.createClient(self.baseUrl, function (err, client) {
      if (err) {
        return next(err);
      }

      soapClient = client;

      return next(null, client);
    })
  };
}

/**
 * @param method
 * @param params
 * @param {function(err, results, response)} next
 * @return {*}
 */
EnvoyTransfers.prototype.__envoyApiCall = function __envoyApiCall(method, params, next) {
  this.createClient(function (err, client) {
    if (err) {
      return next(err);
    }
    return client[method](params, next);
  });
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
    'paymentInstructions': [{
      'paymentInstructionV2': {
        'paymentDetails': {
          'countryCode': options.countryCode,
          'payee': options.payee,
          'sourceCurrency': 'EUR',
          'sourceAmount': options.sourceAmount,
          'sourceOrTarget': 'S',
          'merchantReference': options.merchantReference,
          'paymentReference': options.paymentReference
        },
        'bankDetails': {
          'bankName': options.bankName,
          'iban': options.iban,
          'swift': options.swift
          // ,
          // 'fastPayment': 'Y'
        }
      }
    }]
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

// /**
//  *
//  * @desc validate a payin request notification to the notification listener
//  * @param {string} epacs
//  * @param {function(err, results, response)} cb
//  * @return {*}
//  */
// EnvoyTransfers.prototype.paymentConfirmation = function paymentConfirmation(epacs, cb) { //using v2 api
//   return this.__envoyApiCall('payInConfirmationV2', {
//     'auth': {
//       'username': this.username,
//       'password': this.password
//     },
//     'epacsReference': epacs
//   }, cb);
// };

module.exports = EnvoyTransfers;