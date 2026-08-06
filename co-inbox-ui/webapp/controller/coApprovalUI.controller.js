sap.ui.define([
    "sap/ui/core/mvc/Controller",	"sap/ui/model/json/JSONModel",
	"sap/ui/core/format/DateFormat",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"coinboxui/model/formatter"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, DateFormat, MessageBox, MessageToast, formatter) {
        "use strict";

        return Controller.extend("coinboxui.controller.coApprovalUI", {
            formatter: formatter,
            onInit: function () {
                this.getView().setModel(this.getOwnerComponent().getModel("context"), "context");
            }
        });
    });
