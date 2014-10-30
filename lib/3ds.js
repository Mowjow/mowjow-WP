'use strict';

var _ = require('lodash');
var assert = require('assert');
var request = require('request');

function WorldpayAPI(options) {
  _.merge(this, options);

  // todo: remove
  var env = options.worldpay.env;
  var params = options.worldpay.wpapi[env];
  this.env = env;
  this.merchantID = params.merchantID;
  this.username = params.username;
  this.password = params.password;
  this.ottCallbackUrl = params.ottCallbackUrl; // ott url
  this.apiEndpoint = params.url;
  this.isTest = params.isTest;
  this.StoreId = params.StoreId;
  this.CurrencyId = params.CurrencyId;
  this.Currency = params.Currency;
  this.logOutbound = params.logOutbound;
  this.storeId = params.storeId;
  //this.env == 'live' ? '76695623' : '1'; //todo:: get it from config
  /*
   var store_id;
   if (this.env == 'live') {
   if (isset($extra.CAV) || isset($extra.SVID)) {
   store_id = '76695623'; //3DS store
   } else {
   store_id = '76694493'; //Non-3DS Store
   }
   } else {
   store_id = 1;
   }
   */

  // defaults
  this.timeOut = 60000;
  this.version = 6;
}

/*
 * Parse the response returned by Curl
 *
 */
WorldpayAPI.prototype.parseResponse = function parseResponse(string) {
  var response = {};
  var array = string.split('~');//
  _.each(array, function (str) {
    if (!!str) {
      var field = str.split('^');
      response[field[0]] = field[1];
    }
  });
  return response;
};

/**
 *  Build the request string that will be sent to worldpay
 */
/**
 * Prepare request string in special endpoint format
 * @param {object} fields
 * @returns {string}
 */
WorldpayAPI.prototype.buildRequestStrings = function buildRequestStrings(fields) {
  var string = 'StringIn=VersionUsed^7';
  var defaultFields = {
    'MerchantId': this.merchantID,
    'UserName': this.username,
    'UserPassword': this.password,
    'IsTest': this.isTest,
    'TimeOut': this.timeOut
  };

  fields = _.merge(defaultFields, fields); //defaults fields can be overwritten
  _.forEach(fields, function (value, key) {
    string += '~' + key + '^' + value;
  });

  if (this.logOutbound) {
    /* jshint -W044 */
    var sanitizedStrings = string.replace('/CVN\^(\d+)/', 'CVN^***');
    // todo: use optional debug.log
    // console.log('WP_REQUEST_STRING_' + fields.TransactionType, {'strings': sanitizedStrings });
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
WorldpayAPI.prototype.makeRequest = function makeRequest(opts, cb) {
  var self = this;
  var url = opts.url || this.url;
  assert(opts, 'request options is a required param');
  assert(opts.fields, 'request body in opts.fields is a required param');

  var body = opts.fields || this.buildRequestStrings(opts.body);
  return request({
    url: url,
    method: 'POST',
    body: body
  }, function (err, response, body) {
    return cb(err, self.parseResponse(body), response);
  });
};

/*
 *  Get one-time token
 *
 */
WorldpayAPI.prototype.getOTT = function getOTT(cb) {
  var postString = this.buildRequestStrings({
    'TransactionType': 'RD',
    'RequestType': 'G',
    'Action': 'A',
    'OTTResultURL': this.ottCallbackUrl
  });

  return this.makeRequest({'fields': postString}, cb);
};

/*
 *  Check if Card added or not
 *
 */
WorldpayAPI.prototype.addCard = function addCard(ott, cb) {
  var postString = {
    'TransactionType': 'RD',
    'RequestType': 'Q',
    'OTT': ott
  };

  return this.makeRequest({ 'fields': postString }, cb);
};

/*
 *  Check if 3DS is enabled or not
 *
 */
WorldpayAPI.prototype.threeDsVRequest = function threeDsVRequest(customerId, cardId, amount, cb) {
  var postString = this.buildRequestStrings({
    'TransactionType': '3D',
    'RequestType': 'V',
    'CustomerId': customerId,
    'CardId': cardId,
    'Amount': amount,
    'StoreId': this.storeId
  });

  return this.makeRequest({
    'url': this.apiEndpoint,
    'fields': postString
  }, cb);
};

/*
 *  Confirm/Verify 3DS Request
 *
 */
//disable SVID not needed
WorldpayAPI.prototype.threeDsARequest = function threeDsARequest(paRes, svid, cb) {
  var postString = this.buildRequestStrings({
    'TransactionType': '3D',
    'RequestType': 'A',
    'PaRes': encodeURIComponent(paRes),
    'SVID': svid,
    'StoreId': this.storeId
  });

  return this.makeRequest({
    'url': this.apiEndpoint,
    'fields': postString
  }, cb);
};

/*
 *  Authorize and Mark for fund collection at the same time
 *
 */
//use extra field to send CVN or ECI value
WorldpayAPI.prototype.ptSalesRequest = function ptSalesRequest(customerId, cardId, amount, options, cb) {
  var params = _.merge({
    'TransactionType': 'PT',
    'RequestType': 'S',
    'CustomerId': customerId,
    'CardId': cardId,
    'Amount': amount,
    'MOP': 'CC',
    //todo: req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //'REMOTE_ADDR': $_SERVER.REMOTE_ADDR,
    'StoreId': this.storeId,
    'CurrencyId': this.CurrencyId
  }, options);

  var postString = this.buildRequestStrings(params);
  return this.makeRequest({
    'url': this.apiEndpoint,
    'fields': postString
  }, cb);
};

/*
 *  PT Authorization request
 *
 */

//use extra field to send CVN or ECI value
WorldpayAPI.prototype.ptAuthRequest = function ptAuthRequest(customerId, cardId, amount, options, cb) {
  var params = _.merge({
    'TransactionType': 'PT',
    'RequestType': 'A',
    'CustomerId': customerId,
    'CardId': cardId,
    'Amount': amount,
    //todo: req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //'REMOTE_ADDR': $_SERVER.REMOTE_ADDR,
    'MOP': 'CC',
    'StoreId': this.storeId,
    'CurrencyId': this.CurrencyId
  }, options);

  var postString = this.buildRequestStrings(params);
  return this.makeRequest({
    'url': this.apiEndpoint,
    'fields': postString
  }, cb);
};

/*
 *  Send the transaction to RiskGuardian for score
 *
 */
WorldpayAPI.prototype.rgScore = function rgScore(customerId, cardId, amount, options, cb) {
  var params = _.merge({
    'TransactionType': 'RG',
    'CustomerId': customerId,
    'CardId': cardId,
    'Amount': amount,
    'MOP': 'CC',
    'TypeOfSale': 'D',
    'CurrencyId': this.CurrencyId,
    'StoreId': this.storeId,
    //'REMOTE_ADDR': $_SERVER.REMOTE_ADDR, //Todo:: make it proxy/lb safe $_SERVER.X-Forwarded-For/$_SERVER.REMOTE_ADDR
    'IsExtended': 1,
    //todo: check accepted time formats
    'nField1': (new Date()).toISOString().replace(/T/ig, ' ').replace(/\.[\d]{3}Z/, '')
  }, options);

  var postString = this.buildRequestStrings(params);
  return this.makeRequest({
    'url': this.apiEndpoint,
    'fields': postString
  }, cb);
};