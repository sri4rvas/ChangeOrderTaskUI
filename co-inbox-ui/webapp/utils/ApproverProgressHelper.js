/**
 * ApproverProgressHelper.js
 * ---------------------------------------------------------------------
 * Builds the JSON model consumed by ApproverProgress.fragment.xml, from
 * the same task context fields already available to the Task UI per the
 * manifest (approverChain, approverIndex, currentApprover, approvedBy).
 *
 * Call this from the controller's onInit / onBeforeRendering, once task
 * context is available, e.g.:
 *
 *   var oSteps = ApproverProgressHelper.buildModel(oTaskContext);
 *   this.byId("approverProgress").setModel(
 *     new sap.ui.model.json.JSONModel({ steps: oSteps }), "approverProgress"
 *   );
 *
 * Status logic:
 *   - Any entry whose roleCode appears in approvedBy       -> "Approved"
 *   - The entry matching currentApprover.roleCode           -> "Current"
 *     (only if not already found in approvedBy -- handles the brief
 *     window right after advanceIndex.js runs but before this step's
 *     own currentApprover has been refreshed)
 *   - Everything else                                       -> "Pending"
 *
 * Falls back to approverChain if roleDirectory isn't populated (i.e. the
 * decision-driven branch, where roleDirectory may be empty) -- either
 * source works since both carry the same Approver shape.
 */
sap.ui.define([], function () {
  "use strict";

  // Colors deliberately avoid green -- the app theme is already green, so a
  // green "Approved" status would blend into the chrome instead of standing
  // out. Blue/amber/grey give three colors with no overlap against a green
  // shell, and icon *shape* differs too (not relying on color alone).
  var STATUS_CONFIG = {
    Approved: {
      icon: "sap-icon://status-positive",
      iconColor: "#0a6ed1",          // SAP accent blue -- clearly distinct from a green theme
      labelClass: "sapUiSmallText sapThemeText"
    },
    Current: {
      icon: "sap-icon://in-progress-2",
      iconColor: "#e9730c",          // amber/orange -- highest-attention color, draws the eye circle-task-2
      labelClass: "sapUiSmallText sapThemeText sapUiFontBoldWeight"
    },
    Pending: {
      icon: "sap-icon://pending",
      iconColor: "#89919a",          // neutral grey -- recedes, no theme collision either way
      labelClass: "sapUiSmallText sapUiContentLabelColor"
    }
  };

  function buildModel(oTaskContext) {
    var aSource = (oTaskContext.roleDirectory && oTaskContext.roleDirectory.length > 0)
      ? oTaskContext.roleDirectory
      : (oTaskContext.approverChain || []);

    var aApprovedCodes = (oTaskContext.approvedBy || []).map(function (r) {
      return r.roleCode;
    });
    var sCurrentCode = oTaskContext.currentApprover ? oTaskContext.currentApprover.roleCode : null;

    // Sort by index so the line always reads in chain order, regardless of
    // the source array's original ordering.
    var aSorted = aSource.slice().sort(function (a, b) {
      return (a.index || 0) - (b.index || 0);
    });

    return aSorted.map(function (oApprover, i) {
      var sStatus;
      if (aApprovedCodes.indexOf(oApprover.roleCode) !== -1) {
        sStatus = "Approved";
      } else if (oApprover.roleCode === sCurrentCode) {
        sStatus = "Current";
      } else {
        sStatus = "Pending";
      }

      var oCfg = STATUS_CONFIG[sStatus];

      return {
        roleCode: oApprover.roleCode,
        roleName: oApprover.roleName,
        userName: oApprover.userName || "",
        status: sStatus,
        icon: oCfg.icon,
        iconColor: oCfg.iconColor,
        labelClass: oCfg.labelClass,
        tooltip: oApprover.roleName + " — " + sStatus,
        isLast: i === aSorted.length - 1
      };
    });
  }

  return {
    buildModel: buildModel
  };
});