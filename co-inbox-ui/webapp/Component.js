sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "coinboxui/model/models",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    "coinboxui/model/formatter",
    "coinboxui/utils/dataService",
    "sap/m/MessageBox"
  ],
  function (UIComponent, Device, models, JSONModel, DateFormat, formatter, ds, MessageBox) {
    "use strict";

    return UIComponent.extend(
      "coinboxui.Component",
      {
        metadata: {
          manifest: "json",
        },

        /**
         * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
         * @public
         * @override
         */
        init: function () {
          // call the base component's init function
          UIComponent.prototype.init.apply(this, arguments);

          // enable routing
          this.getRouter().initialize();

          // set the device model
          this.setModel(models.createDeviceModel(), "device");
          this._setUiModels();
          this._setTaskModels();




          // ---- 3. Register the task actions (host integration) --------------
          // SAP-recommended custom Task UI pattern: the component owns the inbox
          // handshake and registers the footer actions. Each action delegates to
          // the view controller (which owns comment/validation/completion) via
          // the component EventBus, keeping concerns separated.
          this._registerInboxActions();
        },
        _registerInboxActions: function () {

          this.getInboxAPI().addAction(
            {
              action: "APPROVE",
              label: "Approve",
              type: "accept", // (Optional property) Define for positive appearance
            },
            function () {
              this.completeTask(true);
            },
            this
          );

          this.getInboxAPI().addAction(
            {
              action: "REJECT",
              label: "Reject",
              type: "reject", // (Optional property) Define for negative appearance
            },
            function () {
              this.completeTask(false);
            },
            this
          );

        },
        _setUiModels: function () {

          // "ui" drives busy state / data-source badge / message state.
          this.setModel(new JSONModel({
            busy: false,
            dataSource: "container",   // "container" | "live" | "merged"
            liveError: null,
            readOnly: true,
            standalone: false
          }), "ui");
        },

        _setTaskModels: function () {
          // set the task model
          var startupParameters = this.getComponentData().startupParameters;
          this.setModel(startupParameters.taskModel, "task");

          // set the task context model
          var taskContextModel = new sap.ui.model.json.JSONModel(
            this._getTaskInstancesBaseURL() + "/context"
          );

           taskContextModel.attachRequestCompleted(function (oEvent) {
            this._sInboundContext = Object.assign({}, taskContextModel.getData())
            console.log("Context model data:", taskContextModel.getData());
          }.bind(this));
          taskContextModel.attachRequestFailed(function (oEvent) {
            console.log("Context model failed to load:", oEvent.getParameters());
          });
          this.setModel(taskContextModel, "context");
        },

        _getTaskInstancesBaseURL: function () {
          return (
            this._getWorkflowRuntimeBaseURL() +
            "/task-instances/" +
            this.getTaskInstanceID()
          );
        },

        _getWorkflowRuntimeBaseURL: function () {
          var appId = this.getManifestEntry("/sap.app/id");
          var appPath = appId.replaceAll(".", "/");
          var appModulePath = jQuery.sap.getModulePath(appPath);

          return appModulePath + "/bpmworkflowruntime/v1";
        },

        getTaskInstanceID: function () {
          return this.getModel("task").getData().InstanceID;
        },

        getInboxAPI: function () {
          var startupParameters = this.getComponentData().startupParameters;
          return startupParameters.inboxAPI;
        },

        completeTask: function (approvalStatus) {
          if (!this._oBusyDialog) {
            this._oBusyDialog = new sap.m.BusyDialog({ title: "Please wait", text: (approvalStatus)?"Submitting your approval...":"Submitting your rejection" });
          }

          this.getModel("context").setProperty("/approved", approvalStatus);          
          this._checkBeforeAction().then(() => {
            this._oBusyDialog.open();
            ds.executeAction(this,(this._sComment) ? this._sComment : (approvalStatus)?'Approved':'').then((data) => {
              let decision = this._processBeforCompleteTask(approvalStatus, (this._sComment) ? this._sComment : (approvalStatus)?'Approved':'');
              this._patchTaskInstance(approvalStatus, decision);
              this._refreshTaskList();
            }).catch((err) => {
              MessageBox.error(err?.message || String(err));
            }).finally(() => {
              this._oBusyDialog.close();
            })
          })
        },

        _checkBeforeAction: function () {
          let isApprove = this.getModel("context").getProperty("/approved");
          return new Promise((resolve, reject) => {
            if (!isApprove && (this._sComment == undefined || this._sComment == null || this._sComment.length == 0)) {
              MessageBox.error('Please enter your comments for rejection', {
                title: "Comments Required",
                actions: [sap.m.MessageBox.Action.CLOSE],
                onClose: function (oAction) {
                  if (oAction === sap.m.MessageBox.Action.CLOSE) {
                    reject(false);
                  }
                }.bind(this)
              });
            } else { resolve(true) }

          });

        },

        _processBeforCompleteTask: function (sOutcome, sComment) {
          var sNow = new Date().toISOString();
          var sReviewer = this.getModel("task").getProperty("/ProcessorId") || this.getModel("task").getProperty("/CreatedBy") || "";
          var oDecision = {
            outcome: sOutcome ? 'approved' : 'rejected',
            comment: sComment || "",
            reviewedBy: sReviewer,
            reviewedAt: sNow
          };
          this.getModel("context").setProperty("/_decision", oDecision);

          // Append this level's entry to the shared thread so the NEXT approver
          // sees it. Recorded for every decision (comment optional). A cost
          // snapshot freezes the figures this approver actually saw/approved —
          // the on-screen data stays live; this is the point-in-time record.
          var oCur = this.getModel("context").getProperty("/currentApprover") || {};
          var oCost = this.getModel("context").getProperty("/costBreakdown") || {};
          var aComments = (this.getModel("context").getProperty("/comments") || []).slice();
          aComments.push({
            level: this.getModel("context").getProperty("/levelLabel") || oCur.roleName || "",
            roleName: oCur.roleName || "",
            author: sReviewer,
            decision: sOutcome ? 'approved' : 'rejected',
            comment: sComment || "",
            at: sNow,
            snapshot: {
              total: formatter.sumCosts(oCost),
              currency: oCost.currency || "USD",
              costBreakdown: JSON.parse(JSON.stringify(oCost)),  // what they saw
              source: this.getModel("ui").getProperty("/dataSource"),      // live | merged | container
              capturedAt: sNow,
              byRole: oCur.roleName || ""
            }
          });
          this.getModel("context").setProperty("/comments", aComments);

          if (sOutcome === "APPROVED" || sOutcome === true) {
            this.getModel("context").setProperty("/status", "Approved");
            this.getModel("context").setProperty("/resolutionDate",
              DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" }).format(new Date()));
          }
          return oDecision;
          // var sTaskId = this._getTaskId();

          // SAP-standard completion: PATCH the task instance with the outbound
          // context + COMPLETED status, then ask My Inbox to refresh its list.
          // this._patchTaskInstance(sTaskId, oDecision);
        },

        _buildOutboundContext: function (oDecision) {
          // Round-trip the FULL context this task received, then overlay only the
          // fields this level changed. Preserves every input attribute (approver
          // chain, index, totals, CR container fields, ...) so nothing is lost
          // between approval steps, independent of runtime merge granularity.
          var oBase = {};
          //   try { oBase = JSON.parse(this._sInboundContext || "{}"); } catch (e) { oBase = {}; }

          return Object.assign(oBase, {
            changeRequestNo: this.getModel("context").getProperty("/changeRequestNo"),
            status: this.getModel("context").getProperty("/status"),
            resolutionDate: this.getModel("context").getProperty("/resolutionDate") || null,
            comments: this.getModel("context").getProperty("/comments") || [],   // updated thread
            _decision: oDecision
          });
        },

        _patchTaskInstance: function (approvalStatus, oDecision) {
          var data = {
            status: "COMPLETED",
            decision: approvalStatus ? 'approve' : 'reject',
            context: this._buildOutboundContext(oDecision) //this.getModel("context").getData()
          };

          jQuery.ajax({
            url: this._getTaskInstancesBaseURL(),
            method: "PATCH",
            contentType: "application/json",
            async: false,
            data: JSON.stringify(data),
            headers: {
              "X-CSRF-Token": this._fetchToken(),
            }
          }).done(function (oResponse, sTextStatus, oJqXHR) {
            // Successful response
            console.log("Response:", oResponse);
          }).fail(function (oJqXHR, sTextStatus, sErrorThrown) {
            // Error response
            const oError = oJqXHR.responseJSON;
            const sMessage = oError?.error?.message || oError?.message || oJqXHR.responseText || sErrorThrown || "Unknown error";
            console.error("Status:", oJqXHR.status);
            console.error("Error:", sMessage);
            sap.m.MessageBox.error(sMessage);
          }).always(function () {
            // Runs after success or error
            console.log("Request completed");
          });
        },

        _fetchToken: function () {
          var fetchedToken;

          jQuery.ajax({
            url: this._getWorkflowRuntimeBaseURL() + "/xsrf-token",
            method: "GET",
            async: false,
            headers: {
              "X-CSRF-Token": "Fetch",
            },
            success(result, xhr, data) {
              fetchedToken = data.getResponseHeader("X-CSRF-Token");
            },
          });
          return fetchedToken;
        },

        _refreshTaskList: function () {
          this.getInboxAPI().updateTask("NA", this.getTaskInstanceID());
        },
      }
    );
  }
);
