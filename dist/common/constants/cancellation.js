"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANCEL_WINDOW_MS = exports.CANCEL_WINDOW_HOURS = void 0;
exports.cancelDeadline = cancelDeadline;
exports.isPastCancelWindow = isPastCancelWindow;
exports.CANCEL_WINDOW_HOURS = 24;
exports.CANCEL_WINDOW_MS = exports.CANCEL_WINDOW_HOURS * 60 * 60 * 1000;
function cancelDeadline(startingDate) {
    if (!startingDate)
        return null;
    return new Date(startingDate.getTime() - exports.CANCEL_WINDOW_MS);
}
function isPastCancelWindow(startingDate) {
    const deadline = cancelDeadline(startingDate);
    if (!deadline)
        return false;
    return Date.now() > deadline.getTime();
}
//# sourceMappingURL=cancellation.js.map