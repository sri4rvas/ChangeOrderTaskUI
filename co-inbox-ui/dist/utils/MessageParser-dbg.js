//"sap/base/Log"
/* global _:true */
/***************************************************************
* Description   : This is Formatter used to handle any application
* related user formats like date , time etc
* 
*************************************************************
* Change History:
* 
*************************************************************
* Date      |USER ID    |TPR Number |Description of Change
*************************************************************
*08/11/2026 |SVASAMSETTI   |  |Initial creation
* 
* 
* 
******************************************************************/
sap.ui.define([], function (logger) {
	"use strict";

	return {

		// Parsing error message and format into required from
		// data => errro object that returned by backend
		// message => the message that need to be appended to the retunred data
		ParseError: function (data, message) {
			var response = null,
				error = null,
				errordetails = null,
				msg = message;

			if (data) {

				if (($.type(data) === "string")) {
					msg += ((msg) ? "\n" : "") + data;
					return msg;
				}
                // checking existance whether any error response
				if (data.response && data.response.body) {
					try {// parse string format of error into JSON object
						response = $.parseJSON(data.response.body);
					} catch (err) {
						if (data.message) {
							msg += ((msg) ? "\n" : "") + data.message;
						}
					}
				}
				else if (data.responseText) {
					try {
						response = $.parseJSON(data.responseText);
					} catch (err) {
						if (data.message) {
							msg += ((msg) ? "\n" : "") + data.message;
						}
					}
				} else {
					if (data.message) {
						msg += ((msg) ? "\n" : "") + data.message;
					}
				}
			}

			if (response && response.error) {
				error = response.error;
				if (error.innererror && error.innererror.errordetails && error.innererror.errordetails.length > 0) {
					errordetails = error.innererror.errordetails;
					for (var i = 0, len = errordetails.length; i < len; i++) {
						if (errordetails[i].message && errordetails[i].message.length > 0) {
							if(errordetails[i].message === 'An exception was raised')  continue;
							if (msg.length !== 0) {
								msg += "\n";
							}
							msg += errordetails[i].message;
						}
					}
				} else {
					if (response.error.message && response.error.message.value) {
						msg += ((msg) ? "\n" : "") + response.error.message.value;
					}
				}
			}
			return msg;
		},

		/// Parse message of success response
		ParseSuccess: function (response, imMsg) {
			var msg = null;
			var hdrMessage = response.headers["sap-message"];
			if (!hdrMessage) {
				return msg;
			}
			var hdrMessageObject = JSON.parse(hdrMessage);

			// log the header message
			if (logger) {
				logger.info(hdrMessageObject);
				logger.info(hdrMessageObject.message);
				logger.debug("debug");
				logger.warning("warning");
				logger.error("error");
				logger.fatal("fatal");
			}
			if (hdrMessageObject.message) {
				msg = hdrMessageObject.message;
			}

			if (hdrMessageObject.details) {
				_.each(hdrMessageObject.details, function (m) {
					msg += ((msg) ? "\n" : "") + m.message;
				});

			}

			return msg;
		},

		// adding leading zeros
		Pad: function (n, width, z) {
			var paddingChar = z || "0",
				stringToPad = n + "";
			return stringToPad.length >= width ? stringToPad : new Array(width - stringToPad.length + 1).join(paddingChar) + stringToPad;
		}

	};
});