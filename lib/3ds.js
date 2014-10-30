'use strict';

var _ = require('lodash');
var assert = require('assert');
var request = require('request');


/**
 *
 * @param {object} options
 * @param {boolean} [options.isTest] - live by default, set to true to use api in test mode
 * @param {string} [options.baseUrl] - https://trx3.wpstn.com/stlinkssl/stlink.dll or https://trx9.wpstn.com/stlinkssl/stlink.dll
 * // auth
 * @param {number} options.merchantId - merchant id (required for auth)
 * @param {string} options.username - username (required for auth)
 * @param {string} options.password - password (required for auth)
 * // one time token
 * @param {string} [options.ottCallbackUrl] - ott callback url
 * // 3ds verification
 * @param {string} [options.storeId] - your store id
 * @param {string} [options.currencyId] - currency id, check api documentation
 * @param {string} [options.currency] - currency, check api documentation
 * // debug
 * @param {string} [options.logOutbound] - enable debugging log
 * @constructor
 */
function ThreeDSAPI(options) {
  _.merge(this, options);

  this.baseUrl = options.baseUrl || 'https://trx3.wpstn.com/stlinkssl/stlink.dll';

  // defaults
  this.timeOut = 60000;
}

/**
 * Parse the API response returned by worldpay
 * @param {string} string - response to parse
 * @returns {object}
 */
ThreeDSAPI.prototype.parseResponse = function parseResponse(string) {
  var response = {};
  var array = string.split('~');
  // todo: use reduce
  _.each(array, function (str) {
    if (!!str) {
      var field = str.split('^');
      response[field[0]] = field[1];
    }
  });
  return response;
};

/**
 * Build the request string that will be sent to worldpay
 * @param {object} fields
 * @returns {string}
 */
ThreeDSAPI.prototype.buildRequestStrings = function buildRequestStrings(fields) {
  var string = 'StringIn=VersionUsed^7';
  var defaultFields = {
    'MerchantId': this.merchantID,
    'UserName': this.username,
    'UserPassword': this.password,
    'IsTest': this.isTest,
    'TimeOut': this.timeOut
  };

  var params = _.merge(defaultFields, fields); //defaults fields can be overwritten
  _.forEach(params, function (value, key) {
    string += '~' + key + '^' + value;
  });

  // todo: use optional debug.log
  if (this.logOutbound) {
    /* jshint -W044 */
    var sanitizedStrings = string.replace('/CVN\^(\d+)/', 'CVN^***');
    console.log('WP_REQUEST_STRING_' + params.TransactionType, {'strings': sanitizedStrings});
  }

  return string;
};

/**
 * Make request to API endpoint
 * @param {object} opts
 * @param {string} [opts.fields]
 * @param {function(err, body, response)} cb
 * @returns {*}
 */
ThreeDSAPI.prototype.makeRequest = function makeRequest(opts, cb) {
  var self = this;
  var url = opts.baseUrl || this.baseUrl;
  assert(opts, 'request options is a required param');
  assert(opts.fields, 'request body in opts.fields is a required param');

  var body = opts.fields || this.buildRequestStrings(opts.body);
  return request({
    url: url,
    method: 'POST',
    body: body
  }, function (err, response, body) {
    // todo: here can be an issue
    return cb(err, self.parseResponse(body), response);
  });
};

/**
 * Get one-time token
 * @param {function(err, body, response)} cb
 * @returns {*}
 */
ThreeDSAPI.prototype.getOTT = function getOTT(cb) {
  var params = {
    'TransactionType': 'RD',
    'RequestType': 'G',
    'Action': 'A',
    'OTTResultURL': this.ottCallbackUrl
  };

  return this.makeRequest({body: params}, cb);
};

/**
 * Check if Card added or not
 * @param {string} ott - one time token
 * @param {function(err, body, response)} cb
 * @returns {*}
 */
ThreeDSAPI.prototype.addCard = function addCard(ott, cb) {
  var params = {
    'TransactionType': 'RD',
    'RequestType': 'Q',
    'OTT': ott
  };

  return this.makeRequest({body: params}, cb);
};

/**
 * Check if 3DS is enabled or not
 * @param {object} options
 * @param {string} options.customerId
 * @param {string} options.cardId
 * @param {number} options.amount
 * @param {function(err, body, response)} cb
 * @returns {*}
 */
ThreeDSAPI.prototype.threeDsVRequest = function threeDsVRequest(options, cb) {
  var params = {
    'TransactionType': '3D',
    'RequestType': 'V',
    'CustomerId': options.customerId,
    'CardId': options.cardId,
    'Amount': options.amount,
    'StoreId': this.storeId
  };

  return this.makeRequest({body: params}, cb);
};

/**
 * Confirm/Verify 3DS Request
 * @param paRes - hz
 * @param svid - hz
 * @param cb
 * @returns {*}
 */
ThreeDSAPI.prototype.threeDsARequest = function threeDsARequest(paRes, svid, cb) {
  var params = {
    'TransactionType': '3D',
    'RequestType': 'A',
    'PaRes': encodeURIComponent(paRes),
    'SVID': svid,
    'StoreId': this.storeId
  };

  return this.makeRequest({body: params}, cb);
};

/**
 * Authorize and Mark for fund collection at the same time
 * @param {object} options
 * @param {string} options.customerId
 * @param {string} options.cardId
 * @param {number} options.amount
 * @param {string} options.remoteIp - req.headers['x-forwarded-for'] || req.connection.remoteAddress;
 * @param {string|number} options.CVN
 * @param {string|number} options.ECI
 * @param {function(err, body, response)} cb
 * @returns {*}
 */
ThreeDSAPI.prototype.ptSalesRequest = function ptSalesRequest(options, cb) {
  var params = _.merge({
    'TransactionType': 'PT',
    'RequestType': 'S',
    'CustomerId': options.customerId,
    'CardId': options.cardId,
    'Amount': options.amount,
    'MOP': 'CC',
    'REMOTE_ADDR': options.remoteIp,
    'StoreId': this.storeId,
    'CurrencyId': this.currencyId
  }, options);

  return this.makeRequest({body: params}, cb);
};

/**
 * PT Authorization request
 * @param {object} options
 * @param {string} options.customerId
 * @param {string} options.cardId
 * @param {number} options.amount
 * @param {string} options.remoteIp - req.headers['x-forwarded-for'] || req.connection.remoteAddress;
 * @param {string|number} options.CVN
 * @param {string|number} options.ECI
 * @param {function(err, body, response)} cb
 * @returns {*}
 */
ThreeDSAPI.prototype.ptAuthRequest = function ptAuthRequest(options, cb) {
  var params = _.merge({
    'TransactionType': 'PT',
    'RequestType': 'A',
    'CustomerId': options.customerId,
    'CardId': options.cardId,
    'Amount': options.amount,
    'REMOTE_ADDR': options.remoteIp,
    'MOP': 'CC',
    'StoreId': this.storeId,
    'CurrencyId': this.currencyId
  }, options);

  return this.makeRequest({body: params}, cb);
};

/**
 * Send the transaction to RiskGuardian for score
 * @param {object} options
 * @param {string} options.customerId
 * @param {string} options.cardId
 * @param {number} options.amount
 * @param {string} options.remoteIp - req.headers['x-forwarded-for'] || req.connection.remoteAddress;
 * @param {function(err, body, response)} cb
 * @returns {*}
 */
ThreeDSAPI.prototype.rgScore = function rgScore(options, cb) {
  var params = _.merge({
    'TransactionType': 'RG',
    'CustomerId': options.customerId,
    'CardId': options.cardId,
    'Amount': options.amount,
    'MOP': 'CC',
    'TypeOfSale': 'D',
    'CurrencyId': this.currencyId,
    'StoreId': this.storeId,
    'REMOTE_ADDR': options.remoteIp,
    'IsExtended': 1,
    //todo: check accepted time formats
    'nField1': (new Date()).toISOString().replace(/T/ig, ' ').replace(/\.[\d]{3}Z/, '')
  }, options);

  return this.makeRequest({body: params}, cb);
};

module.exports = ThreeDSAPI;