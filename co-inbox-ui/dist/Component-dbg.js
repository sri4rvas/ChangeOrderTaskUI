sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "coinboxui/model/models",
  ],
  function (UIComponent, Device, models) {
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

          this.setTaskModels();

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

        setTaskModels: function () {
          // set the task model
          var startupParameters = this.getComponentData().startupParameters;
          this.setModel(startupParameters.taskModel, "task");

          // set the task context model
          var taskContextModel = new sap.ui.model.json.JSONModel(
            this._getTaskInstancesBaseURL() + "/context"
          );

                var taskContextInputModel = new sap.ui.model.json.JSONModel(
            this._getTaskInstancesBaseURL() + "/context/input"
          );
                var taskContextInputModel = new sap.ui.model.json.JSONModel(
            this._getTaskInstancesBaseURL() + "/context/input"
          );
          taskContextInputModel.attachRequestCompleted(function (oEvent) {
            console.log("Context model data:", taskContextModel.getData());
          });

          taskContextModel.attachRequestCompleted(function (oEvent) {
            console.log("Context model data:", taskContextModel.getData());
          });
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
          this.getModel("context").setProperty("/approved", approvalStatus);
          this._patchTaskInstance(approvalStatus);
          this._refreshTaskList();
        },


		_buildOutboundContext: function (oDecision) {
			// Round-trip the FULL context this task received, then overlay only the
			// fields this level changed. Preserves every input attribute (approver
			// chain, index, totals, CR container fields, ...) so nothing is lost
			// between approval steps, independent of runtime merge granularity.
			var oBase = {};
			try { oBase = JSON.parse(this._sInboundContext || "{}"); } catch (e) { oBase = {}; }

			return Object.assign(oBase, {
				changeRequestNo: this._oCr.getProperty("/changeRequestNo"),
				status: this._oCr.getProperty("/status"),
				resolutionDate: this._oCr.getProperty("/resolutionDate") || null,
				comments: this._oCr.getProperty("/comments") || [],   // updated thread
				_decision: oDecision
			});
		},

        _patchTaskInstance: function (approvalStatus) {
          var data = {
            status: "COMPLETED",
            decision: approvalStatus ? 'approve' : 'reject',
            context: this.getModel("context").getData()
          };

          jQuery.ajax({
            url: this._getTaskInstancesBaseURL(),
            method: "PATCH",
            contentType: "application/json",
            async: false,
            data: JSON.stringify(data),
            headers: {
              "X-CSRF-Token": this._fetchToken(),
            },
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
