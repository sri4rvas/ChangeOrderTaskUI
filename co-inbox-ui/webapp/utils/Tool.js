/***************************************************************
* Description   : This is Formatter used to handle any application
* related user formats like date , time etc
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
sap.ui.define(["sap/ui/core/Core"], function (core) {
    "use strict";

    return {

        _deepCompare: function () {
            var i, l, leftChain = [],
                rightChain = [];

            function compare2Objects(x, y) {

                // remember that NaN === NaN returns false
                // and isNaN(undefined) returns true
                if (isNaN(x) && isNaN(y) && typeof x === "number" && typeof y === "number") {
                    return true;
                }

                // Compare primitives and functions.
                // Check if both arguments link to the same object.
                // Especially useful on step when comparing prototypes
                if (x === y) {
                    return true;
                }

                // Works in case when functions are created in constructor.
                // Comparing dates is a common scenario. Another built-ins?
                // We can even handle functions passed across iframes
                if ((typeof x === "function" && typeof y === "function") ||
                    (x instanceof Date && y instanceof Date) ||
                    (x instanceof RegExp && y instanceof RegExp) ||
                    (x instanceof String && y instanceof String) ||
                    (x instanceof Number && y instanceof Number)) {
                    return x.toString() === y.toString();
                }

                // At last checking prototypes as good a we can
                if (!(x instanceof Object && y instanceof Object)) {
                    return false;
                }

                if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
                    return false;
                }

                if (x.constructor !== y.constructor) {
                    return false;
                }

                if (x.prototype !== y.prototype) {
                    return false;
                }

                // Check for infinitive linking loops
                if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
                    return false;
                }

                // Quick checking of one object beeing a subset of another.
                // todo: cache the structure of arguments[0] for performance
                for (var p in y) {
                    if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                        return false;
                    } else if (typeof y[p] !== typeof x[p]) {
                        return false;
                    }
                }

                for (var p in x) {
                    if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                        return false;
                    } else if (typeof y[p] !== typeof x[p]) {
                        return false;
                    }

                    switch (typeof (x[p])) {
                        case "object":
                        case "function":

                            leftChain.push(x);
                            rightChain.push(y);

                            if (!compare2Objects(x[p], y[p])) {
                                return false;
                            }

                            leftChain.pop();
                            rightChain.pop();
                            break;
                        default:
                            if (x[p] !== y[p]) {
                                return false;
                            }
                            break;
                    }
                }

                return true;
            }

            if (arguments.length < 1) {
                return true;
            }

            for (i = 1, l = arguments.length; i < l; i++) {

                leftChain = []; //Todo: vc can be cached
                rightChain = [];

                if (!compare2Objects(arguments[0], arguments[i])) {
                    return false;
                }
            }

            return true;
        },

        /**
         * Compare two JSON arrays and return changed objects
         *
         * @param {Array} oldArr - original array
         * @param {Array} newArr - updated array
         * @param {Array} keyFields - fields that uniquely identify an object (e.g. ["CountLocId", "Upc"])
         * @returns {Array} changedItems
         */
        getChangedObjects: function (oldArr, newArr, keyFields) {
            var changed = [];
            try {
                function makeKey(obj) {
                    return keyFields.map(k => obj[k]).join("|");
                }

                // Convert old array to map for fast lookup
                var oldMap = {};
                oldArr.forEach(o => oldMap[makeKey(o)] = o);

                newArr.forEach(newObj => {
                    var key = makeKey(newObj);
                    var oldObj = oldMap[key];

                    // New item (not in old array)
                    if (!oldObj) {
                        changed.push({
                            type: "NEW",
                            data: newObj
                        });
                        return;
                    }

                    // Modified item
                    var modified = Object.keys(newObj).some(f =>
                        JSON.stringify(newObj[f]) !== JSON.stringify(oldObj[f])
                    );

                    if (modified) {
                        changed.push({
                            type: "MODIFIED",
                            data: newObj,
                            old: oldObj
                        });
                    }
                });

                // Deleted items (in old array but not in new array)
                let newArrKeys = newArr.map(o => makeKey(o));
                oldArr.forEach(oldObj => {
                    var key = makeKey(oldObj);
                    if (!newArrKeys.includes(key)) {
                        changed.push({
                            type: "DELETED",
                            data: oldObj
                        });
                    }
                });
            } catch (error) {
                console.log(error);

            }
            return changed;
        },

        /**
 * Derive new array with limited fields
 * @param {Array} arr - original array of objects
 * @param {Array} fields - array of field names to keep
 * @returns {Array} new array with only specified fields
 */
        pickFields: function (arr, fields) {
            return arr.map(obj => {
                let newObj = {};
                fields.forEach(f => {
                    if (obj.hasOwnProperty(f)) {
                        newObj[f] = obj[f].toString();
                    }
                });
                return newObj;
            });
        }


    };
});