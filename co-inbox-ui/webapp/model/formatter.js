sap.ui.define([
	"sap/ui/core/format/NumberFormat"
], function (NumberFormat) {
	"use strict";

	var COST_KEYS = [
		"joist", "deck", "otherProduct", "grating",
		"freightCost", "fieldCost", "internalCost", "loadingCost",
		"joistMarkup", "deckMarkup", "opMarkup", "gratingMarkup", "salesTax"
	];

	return {

		/** true when a value is present (not null / undefined / empty). Drives
		 *  conditional visibility of cost rows. Zero counts as a value. */
		hasValue: function (vValue) {
			return vValue !== null && vValue !== undefined && vValue !== "" && vValue !== 0;
		},

		/** Renders a value or an em-dash when empty/null. Mirrors the mockup. */
		orDash: function (vValue) {
			if (vValue === null || vValue === undefined || vValue === "") {
				return "\u2014";
			}
			return vValue;
		},

		/** Amount with two decimals, or em-dash when null. e.g. 1200 -> "1,200.00" */
		amount: function (vValue) {
			if (vValue === null || vValue === undefined || vValue === "") {
				return "\u2014";
			}
			var oFmt = NumberFormat.getFloatInstance({
				minFractionDigits: 2,
				maxFractionDigits: 2,
				groupingEnabled: true
			});
			return oFmt.format(Number(vValue));
		},

		/** Currency-prefixed total, e.g. "$16,535.00". */
		total: function (oCost) {
			if (!oCost) { return "\u2014"; }
			var fSum = COST_KEYS.reduce(function (fAcc, sKey) {
				var v = oCost[sKey];
				return fAcc + (v ? Number(v) : 0);
			}, 0);
			var oFmt = NumberFormat.getCurrencyInstance({
				showMeasure: false,
				minFractionDigits: 2,
				maxFractionDigits: 2
			});
			var sSymbol = oCost.currency === "USD" ? "$" : (oCost.currency ? oCost.currency + " " : "");
			return sSymbol + oFmt.format(fSum);
		},

		/** Numeric total used for reconciliation with the backend total. */
		sumCosts: function (oCost) {
			if (!oCost) { return 0; }
			return COST_KEYS.reduce(function (fAcc, sKey) {
				var v = oCost[sKey];
				return fAcc + (v ? Number(v) : 0);
			}, 0);
		},

		/** ObjectStatus state for the priority chip. */
		priorityState: function (sPriority) {
			switch ((sPriority || "").toLowerCase()) {
				case "Very High": return "Error";
				case "High":     return "Warning";
				case "Medium":   return "Information";
				default:         return "None";
			}
		},

		/** ObjectStatus state for the status chip. */
		statusState: function (sStatus) {
			switch ((sStatus || "").toLowerCase()) {
				case "approved":       return "Success";
				case "rejected":       return "Error";
				case "pending review": return "Warning";
				default:               return "Information";
			}
		},

		/** "E000002210 — CARLOS MENDEZ" from id + name. */
		vpm: function (sId, sName) {
			if (sId && sName) { return sId + " \u2014 " + sName; }
			return sId || sName || "\u2014";
		},

		/** Data-source badge text. */
		sourceText: function (sSource) {
			switch (sSource) {
				case "live":   return "Live S/4HANA";
				case "merged": return "Live S/4HANA (container fallback for gaps)";
				default:       return "Workflow container";
			}
		},

		sourceState: function (sSource) {
			return sSource === "container" ? "Warning" : "Success";
		},

		/* ---- Approval comment thread ---- */

		/** Header for a thread entry: role name, else the user id. */
		commentSender: function (sRoleName, sAuthor) {
			return sRoleName || sAuthor || "Approver";
		},

		/** ISO timestamp -> readable date/time, or empty. */
		commentTime: function (sIso) {
			if (!sIso) { return ""; }
			var d = new Date(sIso);
			if (isNaN(d.getTime())) { return sIso; }
			return d.toLocaleString();
		},

		/** Comment body, with a muted placeholder when none was entered. */
		orDashComment: function (sText) {
			return (sText && sText.trim()) ? sText : "(no comment)";
		},

		/** Decision label shown as the entry's info line. */
		decisionLabel: function (sDecision) {
			switch (sDecision) {
				case "APPROVED":  return "Approved";
				case "REJECTED":  return "Rejected";
				case "SENT_BACK": return "Sent back";
				default:          return sDecision || "";
			}
		},

		/** Info state colour for the decision label. */
		commentInfoState: function (sDecision) {
			switch (sDecision) {
				case "APPROVED":  return "Success";
				case "REJECTED":  return "Error";
				case "SENT_BACK": return "Warning";
				default:          return "None";
			}
		},

		/** "Approved · $16,535.00" — decision plus the amount that approver signed for. */
		decisionWithAmount: function (sDecision, fTotal, sCurrency) {
			var mLabel = { APPROVED: "Approved", REJECTED: "Rejected", SENT_BACK: "Sent back" };
			var sLabel = mLabel[sDecision] || sDecision || "";
			if (fTotal === undefined || fTotal === null || fTotal === "") {
				return sLabel;
			}
			var oFmt = NumberFormat.getFloatInstance({
				minFractionDigits: 2, maxFractionDigits: 2, groupingEnabled: true
			});
			var sSym = sCurrency === "USD" ? "$" : (sCurrency ? sCurrency + " " : "");
			return sLabel + " \u00b7 " + sSym + oFmt.format(Number(fTotal));
		}
	};
});
