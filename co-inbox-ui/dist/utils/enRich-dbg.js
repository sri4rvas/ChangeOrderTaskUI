/***************************************************************
* Description   : This is Inbox data enricher 
* 
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
sap.ui.define(["sap/ui/core/Core",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "coinboxui/model/formatter"
], function (core, JSONModel, DateFormat, MessageBox, MessageToast, formatter) {
    "use strict";

    // Maps flat S/4 OData V2 properties -> "cr" model shape.
    var COST_MAP = {
        freightCost: "FreightCost", fieldCost: "FieldCost", internalCost: "InternalCost",
        loadingCost: "LoadingCost", joistMarkup: "JoistMarkup", deckMarkup: "DeckMarkup",
        opMarkup: "OpMarkup", gratingMarkup: "GratingMarkup", salesTax: "SalesTax"
    };
    var SCALAR_MAP = {
        changeRequestNo: "ChangeRequestNo", changeRequestType: "ChangeRequestType",
        changeRequestTitle: "ChangeRequestTitle", projectName: "ProjectName",
        customerCoNo: "CustomerCoNo", jobId: "JobId", supplyPlant: "SupplyPlant",
        salesOrder: "SalesOrder", status: "Status", priority: "Priority",
        vpmId: "VpmId", vpmName: "VpmName", contactName: "ContactName", company: "Company",
        email: "Email", phone: "Phone", fax: "Fax", reasonDescription: "ReasonDescription",
        findings: "Findings", correctiveAction: "CorrectiveAction", csrType: "CsrType",
        coFormOutput: "CoFormOutput", detailingHour: "DetailingHour", designHour: "DesignHour",
        estimatedDelayDays: "EstimatedDelayDays", resolution: "Resolution"
    };
    var DATE_MAP = {
        requestReturnDate: "RequestReturnDate", resolutionDate: "ResolutionDate"
    };
    return {
        /* ============================================================
         *  Live S/4HANA fetch (via BTP destination -> xs-app.json route)
         * ============================================================ */

        _loadLiveData: function (oComp) {
            var sCrNo = oComp.getModel('context').getProperty('/changeRequestNo');
            var oModel = oComp.getModel();
            if (!oModel) {
                oComp.getModel("ui").setProperty("/liveError", this._t("errNoService", null, oComp));
                return;
            }
            oComp.getModel("ui").setProperty("/busy", true);

            var sPath = oModel.createKey("/ChangeRequestSet", { ChangeRequestNo: sCrNo });

            oModel.read(sPath, {
                success: function (oResult) {
                    let liveData = JSON.parse(oResult.data);
                    oComp.getModel("ui").setProperty("/liveData", liveData);
                    this._mergeLive(oComp, liveData);
                    oComp.getModel("ui").setProperty("/dataSource", "merged");
                    oComp.getModel("ui").setProperty("/busy", false);
                }.bind(this),
                error: function (oErr) {
                    // Keep the container data on screen; surface the failure.
                    oComp.getModel("ui").setProperty("/busy", false);
                    oComp.getModel("ui").setProperty("/dataSource", "container");
                    oComp.getModel("ui").setProperty("/liveError", this._extractError(oErr));
                }.bind(this)
            });
        },
        _mergeLive: function (oComp, oS4) {
            var oCr = oComp.getModel('context').getData();
            var oDateFmt = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });

            // scalars: live value wins when present, otherwise keep container
            Object.keys(SCALAR_MAP).forEach(function (sTarget) {
                var v = oS4[SCALAR_MAP[sTarget]];
                if (v !== undefined && v !== null && v !== "") { oCr[sTarget] = v; }
            });

            // dates: V2 returns JS Date or /Date(ms)/
            Object.keys(DATE_MAP).forEach(function (sTarget) {
                var v = oS4[DATE_MAP[sTarget]];
                if (v) { oCr[sTarget] = this._toIsoDate(v, oDateFmt); }
            }.bind(this));

            // costs: Edm.Decimal arrives as string
            oCr.costBreakdown = oCr.costBreakdown || {};
            Object.keys(COST_MAP).forEach(function (sTarget) {
                var v = oS4[COST_MAP[sTarget]];
                if (v !== undefined && v !== null && v !== "") {
                    oCr.costBreakdown[sTarget] = Number(v);
                }
            });
            if (oS4.Currency) { oCr.costBreakdown.currency = oS4.Currency; }
            if (oS4.TotalAmount) { oCr.costBreakdown.totalAmount = Number(oS4.TotalAmount); }

            oComp.getModel('context').setData(oCr);
            this._reconcileTotal(oComp);
        },

        /** Warn if the backend total disagrees with the summed line items. */
        _reconcileTotal: function (oComp) {
            var oCost = oComp.getModel('context').getProperty("/costBreakdown") || {};
            if (oCost.totalAmount == null) { return; }
            var fComputed = formatter.sumCosts(oCost);
            if (Math.abs(fComputed - Number(oCost.totalAmount)) > 0.01) {
                oComp.getModel("ui").setProperty("/liveError",
                    this._t("warnTotalMismatch", [
                        formatter.amount(oCost.totalAmount), formatter.amount(fComputed)
                    ], oComp));
            }
        },

        _toIsoDate: function (v, oDateFmt) {
            if (v instanceof Date) { return oDateFmt.format(v); }
            var m = /\/Date\((\d+)\)\//.exec(String(v));
            if (m) { return oDateFmt.format(new Date(parseInt(m[1], 10))); }
            return String(v);
        },


        _extractError: function (oErr) {
            try {
                var s = oErr.responseText || (oErr.response && oErr.response.body) || "";
                var o = JSON.parse(s);
                return (o.error && o.error.message && (o.error.message.value || o.error.message))
                    || o.message || this._t("errGeneric");
            } catch (e) {
                return (oErr && oErr.message) || this._t("errGeneric");
            }
        },

        _pascal: function (s) {
            return s.toLowerCase().replace(/(^|_)(\w)/g, function (_m, _p, c) { return c.toUpperCase(); });
        },

        _t: function (sKey, aArgs, oComp) {
            return oComp.getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        }
    }
});