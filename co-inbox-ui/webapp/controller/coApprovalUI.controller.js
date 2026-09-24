sap.ui.define([
    "sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/PDFViewer",
    "coinboxui/model/formatter",
    "coinboxui/utils/dataService",
    "coinboxui/utils/enRich"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, DateFormat, MessageBox, MessageToast, PDFViewer, formatter, ds, enricher) {
        "use strict";


        return Controller.extend("coinboxui.controller.coApprovalUI", {
            formatter: formatter,
            onInit: function () {
                this.getView().setModel(this.getOwnerComponent().getModel("context"), "context");
                this.getView().setModel(this.getOwnerComponent().getModel("ui"), "ui");

                this.byId("approverProgressBar").setModel(this.getOwnerComponent().getModel("approverProgress"));
                this.getOwnerComponent().getEventBus().subscribe("pdfPreviewChannel", "setPdfSource", this._setPdfPreviewContent, this);
                //	this._loadContainer();
                //this._setPdfPreviewContent();
            },
            onExit: function () {
                this.getOwnerComponent().getEventBus().unsubscribe("pdfPreviewChannel", "setPdfSource", this._setPdfSource, this);
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
                let sRead = `/co_formSet('${issueID}')/$value`;
                let srcUrl = model.sServiceUrl + sRead;
                this._pdfViewer.setIsTrustedSource(true);
                this._pdfViewer.setSource(srcUrl);
                this._pdfViewer.setTitle( "Change Order# " + issueID);
                this._pdfViewer.open();

                return true;

                var oLink = document.createElement("a");
                oLink.href = model.sServiceUrl + sRead;
                oLink.target = "_blank";
                oLink.download = "ChangeOrder_" + issueID + ".pdf";
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);

            },
            _setPdfPreviewContent: function (oEvent) {
                this._pdfViewer = new PDFViewer({
                    title:"Change Order Document",
                    isTrustedSource: true
                });
                this.getView().addDependent(this._pdfViewer);
            },
            onMenuItemSelected: function (oEvent) {
                if (sKey === "preview") {
                    this.handleGetChangeOrderPdf('P');
                } else if (sKey === "download") {
                    this.handleGetChangeOrderPdf('D');
                }
            },

            _downloadPdf: function (sUrl) {
                // Static/public URL — browser handles it directly
                var oLink = document.createElement("a");
                oLink.href = sUrl;
                oLink.download = sUrl.split("/").pop() || "document.pdf";
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
            }

        });
    });
