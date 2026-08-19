/***************************************************************
 * Description   : Utility / Service module for 
 *                 Handles OData operations such as read, create,
 *                 update, delete, submit, and authorization.
 *
 * This module is used by controllers to interact with backend
 * services and manage batch operations.
 ***************************************************************
 * Change History:
 ***************************************************************
 * Date       | USER ID  | TPR Number  | Description
 ***************************************************************
 *08/11/2026 |SVASAMSETTI   |     |Initial creation
 ***************************************************************/
sap.ui.define(
    ["sap/ui/core/Core", "./MessageParser", "./Tool"],
    function (core, mp, util) {
        "use strict";

        return {

            /* =========================================================== */
            /* Read Operations                                             */
            /* =========================================================== */

            /**
             * Reads location header and item data for the selected location.
             * Stores a deep-cloned copy in biModel for change comparison.
             *
             * @param {object} vc - View controller reference
             * @param {string} query - Search query (currently unused)
             */
            searchMaterials: function (vc, query) {
                return new Promise(function (resolve, reject) {
                    let oModel = vc.getOwnerComponent().getModel();

                    oModel.read(`/MaterialSet(guid'${vc.guid}')`, {
                        urlParameters: {
                            "$expand": "CountItemSet,CountHeader"
                        },
                        success: function (oData) {
                            // Store before-image snapshot
                            let clonedData = structuredClone(oData);
                            vc.getOwnerComponent().getModel("biModel").setData(clonedData);
                            resolve(oData);
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    });
                });
            },

            /* =========================================================== */
            /* Validation & Lookup                                         */
            /* =========================================================== */

            /**
             * Product Search.
             *
             * @param {object} vc - View controller reference
             * @param {string} gtin - UPC / GTIN value
             */
            searchData: async function (vc, sSearchValue) {
                return new Promise(function (resolve, reject) {
                    let oModel = vc.getOwnerComponent().getModel();
                    let countId = vc.getView().getModel("locModel").getProperty("/CountHeader/CountId");
                    let aFilters = [
                        new sap.ui.model.Filter("CountId", sap.ui.model.FilterOperator.EQ, countId)
                    ];
                    oModel.read(`/EntitySet?`, {
                        filters: aFilters,
                        urlParameters: {
                            "search": sSearchValue.toString()
                        },
                        success: function (oData) {
                            if (oData.results.length > 0) {
                                resolve(oData.results);
                            } else {
                                reject();
                            }
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    });
                });
            },


            /* =========================================================== */
            /* Delete Operations                                           */
            /* =========================================================== */

            /**
             * Deletes a count item from backend for a specific Item.
             *
             * @param {object} vc - View controller reference
             * @param {object} row - Item row data to delete
             */
            deleteItem: function (vc, row) {
                return new Promise(function (resolve, reject) {
                    let oModel = vc.getOwnerComponent().getModel();

                    // Build entity key path
                    var sPath = oModel.createKey("/EntitySet", {
                        CountLocId: row.CountLocId,
                        Upc: row.Upc
                    });

                    oModel.remove(sPath, {
                        success: function (data, response) {
                            if (response.statusCode >= 200 && response.statusCode <= 299) {
                                resolve();
                            } else {
                                reject(mp.ParseError(data, ""));
                            }
                        },
                        error: function (data) {
                            reject(mp.ParseError(data, ""));
                        },
                        async: true
                    });
                });
            },

            /* =========================================================== */
            /* Create Operations                                           */
            /* =========================================================== */

            /**
             * Creates a new Item.
             *
             * @param {object} vc - Component / controller reference
             * @param {object} data - Location payload
             */
            createItem: function (vc, data) {
                return new Promise(function (resolve, reject) {
                    let oModel = vc.getModel();
                    oModel.create(`/ItemSet`, this._fixBeforeCreate(data), {
                        headers: {
                            "user": window.sessionStorage.getItem("EUSERID")
                        },
                        success: function (data, response) {
                            if (response.statusCode >= 200 && response.statusCode <= 299) {
                                resolve({
                                    data: data,
                                    msg: mp.ParseSuccess(response)
                                });
                            } else {
                                reject(mp.ParseError(data, ""));
                            }
                        },
                        error: function (data) {
                            reject(mp.ParseError(data, ""));
                        },
                        async: true
                    });
                }.bind(this));
            },

            /* =========================================================== */
            /* Save / Batch Handling                                       */
            /* =========================================================== */

            /**
             * Saves changes made to count items using batch processing.
             * Compares before-image and after-image to determine deltas.
             *
             * @param {object} vc - View controller reference
             */
            saveChanges: function (vc) {
                return new Promise(function (resolve, reject) {
                    let oModel = vc.getOwnerComponent().getModel();

                    // Fields to track for changes
                    let cloneFields = ["CountLocId", "Upc", "CountQty"];

                    let afterImage = util.pickFields(
                        structuredClone(vc.getOwnerComponent().getModel('locModel').getData().CountItemSet.results),
                        cloneFields
                    );

                    let beforeImage = util.pickFields(
                        structuredClone(vc.getOwnerComponent().getModel('biModel').getData().CountItemSet.results),
                        cloneFields
                    );

                    let keys = ["CountLocId", "Upc"];

                    // Determine changed objects
                    let changedItems = util.getChangedObjects(beforeImage, afterImage, keys);

                    // Create batch requests
                    let sGroupId = this._createBatchRequestsBeforeSubmit(oModel, changedItems);

                    // Submit batch
                    oModel.submitChanges({
                        groupId: sGroupId,
                        success: function (oData) {
                            let error = "";
                            if (oData.__batchResponses) {
                                oData.__batchResponses.forEach(function (resp) {
                                    if (resp.response && resp.response.statusCode >= 300) {
                                        error = mp.ParseError(resp, error);
                                    }
                                });
                            }
                            error ? reject(error) : resolve();
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    });
                }.bind(this));
            },

            /**
             * Creates batch requests (create/update/delete) before submit.
             *
             * @param {object} oModel - OData model
             * @param {array} changedItems - Delta objects
             */
            _createBatchRequestsBeforeSubmit: function (oModel, changedItems) {
                oModel.setUseBatch(true);

                let aCreateItems = changedItems
                    .filter(item => item.type === 'NEW' || item.type === 'MODIFIED')
                    .map(item => item.data);

                var sGroupId = "batchAllCountItems";
                oModel.setDeferredGroups([sGroupId]);

                // Create / Update operations
                aCreateItems.forEach(function (oItem) {
                    oModel.create("/CountItemSet", oItem, {
                        groupId: sGroupId,
                        headers: {
                            "user": window.sessionStorage.getItem("EUSERID")
                        }
                    });
                });

                return sGroupId;
            },

            /* =========================================================== */
            /* Submit & Authorization                                     */
            /* =========================================================== */

            /**
             * Submits the count location for final processing.
             *
             * @param {object} vc - View controller reference
             */
            executeAction: function (cc,comments) {
                return new Promise(function (resolve, reject) {
                    let oModel = cc.getModel();
                    let isApproved = cc.getModel("context").getProperty("/approved");
                    let currentApprover = cc.getModel("context").getProperty("/currentApprover") || {};
                    oModel.callFunction("/ExecuteAction", {
                        method: "POST",
                        headers: {
                            "Content-Type": 'application/json'
                        },
                        urlParameters: {
                            objectType: currentApprover.isFinal ? 'I':'A',
                            actionType: isApproved ? 'A' : 'R',
                            actionVal: currentApprover.activityKey,
                            comments:comments
                        },
                        success: function (data, response) {
                            if (currentApprover.isFinal) {

                            } else {
                                resolve(data);
                            }

                        },
                        error: function (oError) {
                            reject(mp.ParseError(oError, ""));
                        }
                    });
                });
            },

            /**
             * Validates employee authorization for the application.
             *
             * @param {object} cc - Component reference
             * @param {string} user - Employee ID / PIN
             */
            checkUserAuthorization: function (cc, user) {
                return new Promise(function (resolve, reject) {
                    if (!user) {
                        return reject('Please enter Employee Pin');
                    }

                    // Ignore non-numeric store IDs
                    if (!/\d/.test(user)) {
                        return resolve('Authorization ignored for non-numeric ID');
                    }

                    let oModel = cc.getModel();
                    oModel.callFunction("/CheckUserAuthorization", {
                        method: "POST",
                        urlParameters: {
                            EmployeeNumber: user
                        },
                        success: function (data) {
                            resolve(data);
                        },
                        error: function (oError) {
                            reject(mp.ParseError(oError, ""));
                        }
                    });
                });
            },

            /* =========================================================== */
            /* Utility Helpers                                            */
            /* =========================================================== */

            // Hook to modify data before create (currently passthrough)
            _fixBeforeCreate: function (data) {
                return data;
            },

            // Hook to modify data after create (currently passthrough)
            _fixAfterCreate: function (data) {
                return data;
            },

            /**
             * Pads a number/string with leading characters.
             *
             * @param {string|number} n - Value to pad
             * @param {int} width - Required length
             * @param {string} z - Padding character (default '0')
             */
            pad: function (n, width, z) {
                var paddingChar = z || "0",
                    stringToPad = n + "";
                return stringToPad.length >= width
                    ? stringToPad
                    : new Array(width - stringToPad.length + 1).join(paddingChar) + stringToPad;
            }

        };
    }
);
