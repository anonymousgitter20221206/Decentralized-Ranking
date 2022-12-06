"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inverse = exports.sqrt = exports.P_PLUS1_OVER4 = exports.randFsHex = exports.randFs = exports.bigToHex = exports.randBig = exports.randHex = exports.toBig = exports.TWO = exports.ONE = exports.ZERO = exports.FIELD_ORDER = void 0;
const utils_1 = require("ethers/lib/utils");
const ethers_1 = require("ethers");
const chai_1 = require("chai");
exports.FIELD_ORDER = ethers_1.BigNumber.from('0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47');
exports.ZERO = ethers_1.BigNumber.from('0');
exports.ONE = ethers_1.BigNumber.from('1');
exports.TWO = ethers_1.BigNumber.from('2');
function toBig(n) {
    return ethers_1.BigNumber.from(n);
}
exports.toBig = toBig;
function randHex(n) {
    return utils_1.hexlify(utils_1.randomBytes(n));
}
exports.randHex = randHex;
function randBig(n) {
    return toBig(utils_1.randomBytes(n));
}
exports.randBig = randBig;
function bigToHex(n) {
    return utils_1.hexZeroPad(n.toHexString(), 32);
}
exports.bigToHex = bigToHex;
function randFs() {
    const r = randBig(32);
    return r.mod(exports.FIELD_ORDER);
}
exports.randFs = randFs;
function randFsHex() {
    const r = randBig(32);
    return bigToHex(r.mod(exports.FIELD_ORDER));
}
exports.randFsHex = randFsHex;
exports.P_PLUS1_OVER4 = ethers_1.BigNumber.from('0xc19139cb84c680a6e14116da060561765e05aa45a1c72a34f082305b61f3f52');
// export const P_MINUS3_OVER4 = BigNumber.from('0xc19139cb84c680a6e14116da060561765e05aa45a1c72a34f082305b61f3f51');
// export const P_MINUS1_OVER2 = BigNumber.from('0x183227397098d014dc2822db40c0ac2ecbc0b548b438e5469e10460b6c3e7ea3');
function exp(a, e) {
    let z = ethers_1.BigNumber.from(1);
    let path = ethers_1.BigNumber.from('0x8000000000000000000000000000000000000000000000000000000000000000');
    for (let i = 0; i < 256; i++) {
        z = z.mul(z).mod(exports.FIELD_ORDER);
        if (!e.and(path).isZero()) {
            z = z.mul(a).mod(exports.FIELD_ORDER);
        }
        path = path.shr(1);
    }
    return z;
}
function sqrt(nn) {
    const n = exp(nn, exports.P_PLUS1_OVER4);
    const found = n.mul(n).mod(exports.FIELD_ORDER).eq(nn);
    return { n, found };
}
exports.sqrt = sqrt;
function inverse(a) {
    const z = exports.FIELD_ORDER.sub(exports.TWO);
    return exp(a, z);
}
exports.inverse = inverse;
function mulmod(a, b) {
    return a.mul(b).mod(exports.FIELD_ORDER);
}
function test_sqrt() {
    for (let i = 0; i < 100; i++) {
        const a = randFs();
        const aa = mulmod(a, a);
        const res = sqrt(aa);
        chai_1.assert.isTrue(res.found);
        chai_1.assert.isTrue(mulmod(res.n, res.n).eq(aa));
    }
    const nonResidues = [
        toBig('0x23d9bb51d142f4a4b8a533721a30648b5ff7f9387b43d4fc8232db20377611bc'),
        toBig('0x107662a378d9198183bd183db9f6e5ba271fbf2ec6b8b077dfc0a40119f104cb'),
        toBig('0x0df617c7a009e07c841d683108b8747a842ce0e76f03f0ce9939473d569ea4ba'),
        toBig('0x276496bfeb07b8ccfc041a1706fbe3d96f4d42ffb707edc5e31cae16690fddc7'),
        toBig('0x20fcdf224c9982c72a3e659884fdad7cb59b736d6d57d54799c57434b7869bb3'),
    ];
    for (let i = 0; i < nonResidues.length; i++) {
        const res = sqrt(nonResidues[i]);
        chai_1.assert.isFalse(res.found);
    }
}
function test_inv() {
    for (let i = 0; i < 100; i++) {
        const a = randFs();
        const ia = inverse(a);
        chai_1.assert.isTrue(mulmod(a, ia).eq(exports.ONE));
    }
}
async function test() {
    test_sqrt();
    test_inv();
}
// test();
//# sourceMappingURL=utils.js.map