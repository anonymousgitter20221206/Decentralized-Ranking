"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randG2 = exports.randG1 = exports.randFr = exports.newG2 = exports.newG1 = exports.compressSignature = exports.compressPubkey = exports.aggreagate = exports.sign = exports.newKeyPair = exports.g2ToHex = exports.g2ToBN = exports.g2ToCompressed = exports.g1ToHex = exports.g1ToBN = exports.g1ToCompressed = exports.signOfG2 = exports.signOfG1 = exports.g2 = exports.g1 = exports.mclToHex = exports.mapToPoint = exports.hashToPoint = exports.setMappingMode = exports.setDomainHex = exports.setDomain = exports.init = exports.MAPPING_MODE_FT = exports.MAPPING_MODE_TI = void 0;
const ethers_1 = require("ethers");
const utils_1 = require("./utils");
const hash_to_field_1 = require("./hash_to_field");
const mcl = require('mcl-wasm');
exports.MAPPING_MODE_TI = 'TI';
exports.MAPPING_MODE_FT = 'FT';
let DOMAIN;
async function init() {
    await mcl.init(mcl.BN_SNARK1);
    setMappingMode(exports.MAPPING_MODE_FT);
}
exports.init = init;
function setDomain(domain) {
    DOMAIN = Uint8Array.from(Buffer.from(domain, 'utf8'));
}
exports.setDomain = setDomain;
function setDomainHex(domain) {
    DOMAIN = Uint8Array.from(Buffer.from(domain, 'hex'));
}
exports.setDomainHex = setDomainHex;
function setMappingMode(mode) {
    if (mode === exports.MAPPING_MODE_FT) {
        mcl.setMapToMode(0);
    }
    else if (mode === exports.MAPPING_MODE_TI) {
        mcl.setMapToMode(1);
    }
    else {
        throw new Error('unknown mapping mode');
    }
}
exports.setMappingMode = setMappingMode;
function hashToPoint(msg) {
    if (!ethers_1.ethers.utils.isHexString(msg)) {
        throw new Error('message is expected to be hex string');
    }
    const _msg = Uint8Array.from(Buffer.from(msg.slice(2), 'hex'));
    const hashRes = hash_to_field_1.hashToField(DOMAIN, _msg, 2);
    const e0 = hashRes[0];
    const e1 = hashRes[1];
    const p0 = mapToPoint(e0.toHexString());
    const p1 = mapToPoint(e1.toHexString());
    const p = mcl.add(p0, p1);
    p.normalize();
    return p;
}
exports.hashToPoint = hashToPoint;
function mapToPoint(eHex) {
    const e0 = utils_1.toBig(eHex);
    let e1 = new mcl.Fp();
    e1.setStr(e0.mod(utils_1.FIELD_ORDER).toString());
    return e1.mapToG1();
}
exports.mapToPoint = mapToPoint;
function mclToHex(p, prefix = true) {
    const arr = p.serialize();
    let s = '';
    for (let i = arr.length - 1; i >= 0; i--) {
        s += ('0' + arr[i].toString(16)).slice(-2);
    }
    return prefix ? '0x' + s : s;
}
exports.mclToHex = mclToHex;
function g1() {
    const g1 = new mcl.G1();
    g1.setStr('1 0x01 0x02', 16);
    return g1;
}
exports.g1 = g1;
function g2() {
    const g2 = new mcl.G2();
    g2.setStr('1 0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed 0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2 0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa 0x090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b');
    return g2;
}
exports.g2 = g2;
function signOfG1(p) {
    const y = utils_1.toBig(mclToHex(p.getY()));
    const ONE = utils_1.toBig(1);
    return y.and(ONE).eq(ONE);
}
exports.signOfG1 = signOfG1;
function signOfG2(p) {
    p.normalize();
    const y = mclToHex(p.getY(), false);
    const ONE = utils_1.toBig(1);
    return utils_1.toBig('0x' + y.slice(64))
        .and(ONE)
        .eq(ONE);
}
exports.signOfG2 = signOfG2;
function g1ToCompressed(p) {
    const MASK = utils_1.toBig('0x8000000000000000000000000000000000000000000000000000000000000000');
    p.normalize();
    if (signOfG1(p)) {
        const x = utils_1.toBig(mclToHex(p.getX()));
        const masked = x.or(MASK);
        return utils_1.bigToHex(masked);
    }
    else {
        return mclToHex(p.getX());
    }
}
exports.g1ToCompressed = g1ToCompressed;
function g1ToBN(p) {
    p.normalize();
    const x = utils_1.toBig(mclToHex(p.getX()));
    const y = utils_1.toBig(mclToHex(p.getY()));
    return [x, y];
}
exports.g1ToBN = g1ToBN;
function g1ToHex(p) {
    p.normalize();
    const x = mclToHex(p.getX());
    const y = mclToHex(p.getY());
    return [x, y];
}
exports.g1ToHex = g1ToHex;
function g2ToCompressed(p) {
    const MASK = utils_1.toBig('0x8000000000000000000000000000000000000000000000000000000000000000');
    p.normalize();
    const x = mclToHex(p.getX(), false);
    if (signOfG2(p)) {
        const masked = utils_1.toBig('0x' + x.slice(64)).or(MASK);
        return [utils_1.bigToHex(masked), '0x' + x.slice(0, 64)];
    }
    else {
        return ['0x' + x.slice(64), '0x' + x.slice(0, 64)];
    }
}
exports.g2ToCompressed = g2ToCompressed;
function g2ToBN(p) {
    const x = mclToHex(p.getX(), false);
    const y = mclToHex(p.getY(), false);
    return [
        utils_1.toBig('0x' + x.slice(64)),
        utils_1.toBig('0x' + x.slice(0, 64)),
        utils_1.toBig('0x' + y.slice(64)),
        utils_1.toBig('0x' + y.slice(0, 64)),
    ];
}
exports.g2ToBN = g2ToBN;
function g2ToHex(p) {
    p.normalize();
    const x = mclToHex(p.getX(), false);
    const y = mclToHex(p.getY(), false);
    return ['0x' + x.slice(64), '0x' + x.slice(0, 64), '0x' + y.slice(64), '0x' + y.slice(0, 64)];
}
exports.g2ToHex = g2ToHex;
function newKeyPair() {
    const secret = randFr();
    const pubkey = mcl.mul(g2(), secret);
    pubkey.normalize();
    return { pubkey, secret };
}
exports.newKeyPair = newKeyPair;
function sign(message, secret) {
    const M = hashToPoint(message);
    const signature = mcl.mul(M, secret);
    signature.normalize();
    return { signature, M };
}
exports.sign = sign;
function aggreagate(acc, other) {
    const _acc = mcl.add(acc, other);
    _acc.normalize();
    return _acc;
}
exports.aggreagate = aggreagate;
function compressPubkey(p) {
    return g2ToCompressed(p);
}
exports.compressPubkey = compressPubkey;
function compressSignature(p) {
    return g1ToCompressed(p);
}
exports.compressSignature = compressSignature;
function newG1() {
    return new mcl.G1();
}
exports.newG1 = newG1;
function newG2() {
    return new mcl.G2();
}
exports.newG2 = newG2;
function randFr() {
    const r = utils_1.randHex(12);
    let fr = new mcl.Fr();
    fr.setHashOf(r);
    return fr;
}
exports.randFr = randFr;
function randG1() {
    const p = mcl.mul(g1(), randFr());
    p.normalize();
    return p;
}
exports.randG1 = randG1;
function randG2() {
    const p = mcl.mul(g2(), randFr());
    p.normalize();
    return p;
}
exports.randG2 = randG2;
//# sourceMappingURL=mcl.js.map