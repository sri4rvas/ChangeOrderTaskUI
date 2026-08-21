sap.ui.define([
    "sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "coinboxui/model/formatter",
    "coinboxui/utils/dataService",
    "coinboxui/utils/enRich"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, DateFormat, MessageBox, MessageToast, formatter, ds, enricher) {
        "use strict";


        return Controller.extend("coinboxui.controller.coApprovalUI", {
            formatter: formatter,
            onInit: function () {
                this.getView().setModel(this.getOwnerComponent().getModel("context"), "context");
                this.getView().setModel(this.getOwnerComponent().getModel("ui"), "ui");

             this.byId("approverProgressBar").setModel(this.getOwnerComponent().getModel("approverProgress"));
                //	this._loadContainer();
            },
            onCommentChange: function (oEvent) {
                this.getOwnerComponent()._sComment = oEvent.getParameter("value");
            },
            /* ============================================================
            *  Manual refresh
            * ============================================================ */

            onRefresh: function () {
                var sCrNo = this.getView().getModel("context").getProperty("/changeRequestNo");
                this.getView().getModel("ui").setProperty("/liveError", null);
                var oModel = this.getOwnerComponent().getModel();
                if (oModel && oModel.resetChanges) { oModel.refresh(true); }
                if (sCrNo) { enricher._loadLiveData(this.getOwnerComponent()); }
            },
            handleGetChangeOrderPdf: function (oEvent) {
                let model = this.getOwnerComponent().getModel();
                let issueID = this.getView().getModel("context").getProperty('/changeRequestNo');
                //docCat = view.getModel('currentSalesDocument').getProperty('/DocumentCategory');

                let sRead = `/co_formSet('${issueID}')/$value`;
                return window.open(model.sServiceUrl + sRead);

                var oLink = document.createElement("a");
                oLink.href = model.sServiceUrl + sRead;
                oLink.target = "_blank";
                oLink.download = "ChangeOrder_" + issueID + ".pdf";
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);

            }

        });
    });
