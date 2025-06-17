"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.camelCase = void 0;
/**
 * convert to camelCase
 * @param {string} str
 * @return {string} sampleString
 */
const camelCase = (str) => {
    str = str.charAt(0).toLowerCase() + str.slice(1);
    return str.replace(/[-_](.)/g, function (match, group1) {
        return group1.toUpperCase();
    });
};
exports.camelCase = camelCase;
