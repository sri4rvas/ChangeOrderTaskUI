sap.ui.define([], function () {
	"use strict";

	/**
	 * Cost breakdown is supplied as TWO ARRAYS of line objects:
	 *
	 *   costBreakdown: {
	 *     productLines: [ { key, label, value, actualQty, tons }, ... ],   // Actual Qty | Tons | Cost
	 *     costLines:    [ { key, label, value }, ... ],                    // Cost only
	 *     currency:     "USD",
	 *     totalAmount:  2000
	 *   }
	 *
	 * The total is ALWAYS the sum of every line's `value` (actualQty / tons are
	 * display-only), which is the same set of amounts the old flat object summed.
	 */

	// Default rows + labels. Used only to (a) convert a legacy flat object and
	// (b) label a line that arrives without a label.
	var PRODUCT_DEFS = [
		{ key: "joist", label: "Joist" },
		{ key: "deck", label: "Deck" },
		{ key: "otherProduct", label: "Other Product" },
		{ key: "grating", label: "Grating" }
	];
	var COST_DEFS = [
		{ key: "freightCost", label: "Freight Cost" },
		{ key: "fieldCost", label: "Field Cost" },
		{ key: "internalCost", label: "Internal Cost" },
		{ key: "loadingCost", label: "Loading Cost" },
		{ key: "joistMarkup", label: "Joist Markup" },
		{ key: "deckMarkup", label: "Deck Markup" },
		{ key: "opMarkup", label: "OP Markup" },
		{ key: "gratingMarkup", label: "Grating Markup" },
		{ key: "salesTax", label: "Sales Tax" }
	];

	function toNum(v) {
		if (v === null || v === undefined || v === "") { return null; }
		var n = Number(v);
		return isNaN(n) ? null : n;
	}

	function labelFor(sKey) {
		var a = PRODUCT_DEFS.concat(COST_DEFS);
		for (var i = 0; i < a.length; i++) {
			if (a[i].key === sKey) { return a[i].label; }
		}
		return sKey;
	}

	function isProductKey(sKey) {
		return PRODUCT_DEFS.some(function (d) { return d.key === sKey; });
	}

	function normLine(o) {
		o = o || {};
		return {
			key: o.key || "",
			label: o.label || labelFor(o.key || ""),
			value: toNum(o.value),
			actualQty: toNum(o.actualQty),
			tons: toNum(o.tons)
		};
	}

	/**
	 * Returns a display-ready costBreakdown. Accepts the new two-array shape and,
	 * for backward compatibility, the legacy flat object (converted to the same
	 * arrays so the screen and the total are unchanged).
	 */
	function normalize(oRaw) {
		oRaw = oRaw || {};
		var oOut = { currency: oRaw.currency || "USD" };
		var fTotal = toNum(oRaw.totalAmount);
		if (fTotal !== null) { oOut.totalAmount = fTotal; }

		if (Array.isArray(oRaw.productLines) || Array.isArray(oRaw.costLines)) {
			oOut.productLines = (oRaw.productLines || []).map(normLine);
			oOut.costLines = (oRaw.costLines || []).map(normLine);
		} else {
			oOut.productLines = PRODUCT_DEFS.map(function (d) {
				return normLine({ key: d.key, label: d.label, value: oRaw[d.key] });
			});
			oOut.costLines = COST_DEFS.map(function (d) {
				return normLine({ key: d.key, label: d.label, value: oRaw[d.key] });
			});
		}
		return oOut;
	}

	/** Sum of every line's value (productLines + costLines). */
	function sum(oCost) {
		var o = normalize(oCost);
		return o.productLines.concat(o.costLines).reduce(function (fAcc, oLine) {
			return fAcc + (oLine.value || 0);
		}, 0);
	}

	/** Sets a line's value by key (live S/4 merge). Creates the line if absent. */
	function setLineValue(oCost, sKey, fValue) {
		var aAll = (oCost.productLines || []).concat(oCost.costLines || []);
		for (var i = 0; i < aAll.length; i++) {
			if (aAll[i].key === sKey) { aAll[i].value = fValue; return; }
		}
		var oNew = normLine({ key: sKey, label: labelFor(sKey), value: fValue });
		if (isProductKey(sKey)) {
			(oCost.productLines = oCost.productLines || []).push(oNew);
		} else {
			(oCost.costLines = oCost.costLines || []).push(oNew);
		}
	}

	function trimLine(oLine) {
		var o = {};
		["key", "label"].forEach(function (k) { if (oLine[k]) { o[k] = oLine[k]; } });
		["value", "actualQty", "tons"].forEach(function (k) {
			if (oLine[k] !== null && oLine[k] !== undefined) { o[k] = oLine[k]; }
		});
		return o;
	}

	/**
	 * Payload form for the workflow context / approval snapshot: empty numbers
	 * are OMITTED, never sent as null (an SBPA Number field is not nullable).
	 */
	function toPayload(oCost) {
		var o = normalize(oCost);
		var oOut = {
			productLines: o.productLines.map(trimLine),
			costLines: o.costLines.map(trimLine),
			currency: o.currency
		};
		if (o.totalAmount !== undefined) { oOut.totalAmount = o.totalAmount; }
		return oOut;
	}

	return {
		normalize: normalize,
		sum: sum,
		setLineValue: setLineValue,
		toPayload: toPayload,
		PRODUCT_DEFS: PRODUCT_DEFS,
		COST_DEFS: COST_DEFS
	};
});
