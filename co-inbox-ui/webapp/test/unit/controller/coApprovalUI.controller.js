/*global QUnit*/

sap.ui.define([
	"co-inbox-ui/controller/coApprovalUI.controller"
], function (Controller) {
	"use strict";

	QUnit.module("coApprovalUI Controller");

	QUnit.test("I should test the coApprovalUI controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
