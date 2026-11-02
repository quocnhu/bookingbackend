"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.airportTransferProduct = airportTransferProduct;
exports.isAirportTransferMail = isAirportTransferMail;
exports.refineTemplateTag = refineTemplateTag;
const asString = (value) => typeof value === 'string' ? value : '';
const htmlToText = (html) => {
    if (!html)
        return '';
    return html
        .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
};
function airportTransferProduct(payload) {
    const text = [
        asString(payload.body),
        asString(payload.snippet),
        htmlToText(asString(payload.html)),
    ]
        .filter((part) => part.trim() !== '')
        .join('\n');
    const product = /product(?:\s+name)?\s*:\s*([^\n\r]+)/i
        .exec(text)?.[1]
        ?.trim();
    const option = /product\s+option\s*:\s*([^\n\r]+)/i.exec(text)?.[1]?.trim();
    return { product, option };
}
const AIRPORT_TRANSFER = /\bairport\s*transfer\b/i;
const TRANSFER_TO_FROM_AIRPORT = /\btransfer\s+(?:to|from)\s+(?:the\s+)?airport\b/i;
function isAirportTransferMail(payload) {
    const { product = '', option = '' } = airportTransferProduct(payload);
    const text = `${product} ${option}`;
    return AIRPORT_TRANSFER.test(text) || TRANSFER_TO_FROM_AIRPORT.test(text);
}
function refineTemplateTag(tag, mail) {
    if ((tag === 'advancedViator' || tag === 'viator') &&
        isAirportTransferMail(mail)) {
        return 'airportTransfer';
    }
    return tag;
}
//# sourceMappingURL=airport-transfer.util.js.map