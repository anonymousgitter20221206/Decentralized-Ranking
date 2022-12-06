"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcl = require("./mcl");
const utils_1 = require("./utils");
//const TestBlsFactory_1 = require("../types/ethers-contracts/TestBlsFactory");
const provider_1 = require("./provider");
const { expect, assert } = require("chai");
//import { assert } from 'chai';
const utils_2 = require("ethers/lib/utils");
const hash_to_field_1 = require("./hash_to_field");
const { ethers } = require("hardhat");
const { hashToPoint } = require("./mcl");
//const { TestBls } = require('contracts/TestBls');
//const FACTORY_TEST_BLS = new TestBlsFactory_1.TestBlsFactory(provider_1.wallet);
//const FACTORY_TEST_BLS = new TestBls(wallet);
const MINUS_ONE = utils_1.toBig('0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd46');
const NON_RESIDUE_2 = [utils_1.toBig('0x09'), utils_1.toBig('0x01')];
const DOMAIN_STR = 'testing-evmbls';
const DOMAIN = Uint8Array.from(Buffer.from(DOMAIN_STR, 'utf8'));
describe('BLS', () => {
    let bls;
    before(async function () {
        const BLSExample = await ethers.getContractFactory("TestBLS");
        await mcl.init();
        mcl.setDomain(DOMAIN_STR);
        bls = await BLSExample.deploy();
        await bls.deployed();
    });
    it('sqrt', async function () {
        for (let i = 0; i < 100; i++) {
            const a = utils_1.randFs();
            const r0 = utils_1.sqrt(a);
            const r1 = await bls._sqrt(a);
            assert.isTrue(r0.n.eq(r1[0]));
            assert.equal(r0.found, r1[1]);
            const r2 = await bls._sqrtFaster(a);
            assert.isTrue(r0.n.eq(r2[0]));
            assert.equal(r0.found, r2[1]);
        }
    });
    it('inverse', async function () {
        for (let i = 0; i < 100; i++) {
            const a = utils_1.randFs();
            const r0 = utils_1.inverse(a);
            const r1 = await bls._inverse(a);
            assert.isTrue(r0.eq(r1));
            const r2 = await bls._inverseFaster(a);
            assert.isTrue(r0.eq(r2));
        }
    });
    it('fp is non residue', async function () {
        let r = await bls._isNonResidueFP(MINUS_ONE);
        assert.isTrue(r);
        r = await bls._isNonResidueFP(utils_1.toBig('0x04'));
        assert.isFalse(r);
        const residues = [];
        for (let i = 0; i < 5; i++) {
            const a = utils_1.randFs();
            residues.push(a.mul(a).mod(hash_to_field_1.FIELD_ORDER));
        }
        const nonResidues = [
            utils_1.toBig('0x23d9bb51d142f4a4b8a533721a30648b5ff7f9387b43d4fc8232db20377611bc'),
            utils_1.toBig('0x107662a378d9198183bd183db9f6e5ba271fbf2ec6b8b077dfc0a40119f104cb'),
            utils_1.toBig('0x0df617c7a009e07c841d683108b8747a842ce0e76f03f0ce9939473d569ea4ba'),
            utils_1.toBig('0x276496bfeb07b8ccfc041a1706fbe3d96f4d42ffb707edc5e31cae16690fddc7'),
            utils_1.toBig('0x20fcdf224c9982c72a3e659884fdad7cb59b736d6d57d54799c57434b7869bb3'),
        ];
        for (let i = 0; i < residues.length; i++) {
            r = await bls._isNonResidueFP(residues[i]);
            assert.isFalse(r);
        }
        for (let i = 0; i < nonResidues.length; i++) {
            r = await bls._isNonResidueFP(nonResidues[i]);
            assert.isTrue(r);
        }
    });
    it('fp2 is non residue', async function () {
        let r = await bls._isNonResidueFP2([MINUS_ONE, utils_1.ZERO]);
        assert.isFalse(r);
        r = await bls._isNonResidueFP2(NON_RESIDUE_2);
        assert.isTrue(r);
        const residues = [
            [
                utils_1.toBig('0x291c1493973fe1c89789dc8febbe1293297b4f4669a5ba29ccef5516b99fa8e3'),
                utils_1.toBig('0x277faf1cfd5339d418ebbeb6b7f98a36be0afa6a3c03c133a4e4ff994e3bd3e9'),
            ],
            [
                utils_1.toBig('0x2a502d97952ce7dac491feb17fba2dfa6f92e9378408f2bdb83d8fffb8468edd'),
                utils_1.toBig('0x032867246dc6ba409cd717029ee0a22e3f81b158fcea8536f902d29c8e477506'),
            ],
            [
                utils_1.toBig('0x0f9e5869c4d5c689cdba6589d9c84cf01cbcf724e6e3e6a1c8501def6e259afd'),
                utils_1.toBig('0x1a00ce2041dff1fe6d61d7f39e96fc5e5ffa4e7d37b0ae3b629bb45d081f20b5'),
            ],
            [
                utils_1.toBig('0x07f2912b3f9756481668fdfe73a3c64afb28229be8bd35f6f1166a661aaaea68'),
                utils_1.toBig('0x21aa6705f2c7d33aa61866b54a1db8d219049dd5502c01b07a156952122f0406'),
            ],
            [
                utils_1.toBig('0x16b1b7716c7861f646a5932a9160801f88888203fb46bc4f5166e9cab695ab07'),
                utils_1.toBig('0x2a4de74d279d5a227794717f186ffa3a781a3069789e4de99dcfc9217730ab53'),
            ],
        ];
        const nonResidues = [
            [
                utils_1.toBig('0x04e708d308e4c80df97d911253ddc05335a7aa65065441799138bec037248cb9'),
                utils_1.toBig('0x06cc0a71cbbeb9eaee7ec9898880109418b730eb5e8a7e4fb969c3f522dad361'),
            ],
            [
                utils_1.toBig('0x16945f8bfd9e611407a0569df5e671f4c1e8f5109bc27e2885a401109334c650'),
                utils_1.toBig('0x11542e36b08a2f764e3d94849f360b35597866cef9e0d8a3810e7ccb9aad3800'),
            ],
            [
                utils_1.toBig('0x1caaad1c4d9be66c85838c98b78fed490c629e151bcf082f92c5b0cb187052d9'),
                utils_1.toBig('0x103da08b58de8e64e3b2e0f75ac032441ba37e9bae51d6ae7c044bdfc3ecd952'),
            ],
            [
                utils_1.toBig('0x2b8d1c9600cbf0b27dacf78be1679671507b0991771918a1fcbeef1636649b27'),
                utils_1.toBig('0x28a6dfea2d4a681b754da75a689ccb15374e78a358d52494222de32cf3de1aa6'),
            ],
            [
                utils_1.toBig('0x278490b783c9a02849a8e3d1e9a9f38e994348e11c5cb8ca3a9b48f44f5ae7db'),
                utils_1.toBig('0x101fce260947e70a884047ac1293e411f9e85c851d79350e588ed10f80235cab'),
            ],
        ];
        for (let i = 0; i < residues.length; i++) {
            r = await bls._isNonResidueFP2(residues[i]);
            assert.isFalse(r);
        }
        for (let i = 0; i < nonResidues.length; i++) {
            r = await bls._isNonResidueFP2(nonResidues[i]);
            assert.isTrue(r);
        }
    });
    it('is on curve g1', async function () {
        for (let i = 0; i < 20; i++) {
            const point = mcl.randG1();
            let isOnCurve = await bls._isOnCurveG1(mcl.g1ToHex(point));
            assert.isTrue(isOnCurve);
            const compressed = mcl.g1ToCompressed(point);
            isOnCurve = await bls._isOnCurveG1Compressed(compressed);
            assert.isTrue(isOnCurve);
        }
        for (let i = 0; i < 20; i++) {
            const point = [utils_1.randBig(31), utils_1.randBig(31)];
            const isOnCurve = await bls._isOnCurveG1(point);
            assert.isFalse(isOnCurve);
        }
    });
    it('is on curve g2', async function () {
        for (let i = 0; i < 20; i++) {
            const point = mcl.randG2();
            let isOnCurve = await bls._isOnCurveG2(mcl.g2ToHex(point));
            assert.isTrue(isOnCurve);
            const compressed = mcl.g2ToCompressed(point);
            isOnCurve = await bls._isOnCurveG2Compressed(compressed);
            assert.isTrue(isOnCurve);
        }
        for (let i = 0; i < 20; i++) {
            const point = [utils_1.randBig(31), utils_1.randBig(31), utils_1.randBig(31), utils_1.randBig(31)];
            const isOnCurve = await bls._isOnCurveG2(point);
            assert.isFalse(isOnCurve);
        }
    });
    it('pubkey to uncompressed', async function () {
        for (let i = 0; i < 20; i++) {
            const { pubkey } = mcl.newKeyPair();
            const compressed = mcl.compressPubkey(pubkey);
            const isValid = await bls._isValidCompressedPublicKey(compressed);
            assert.isTrue(isValid);
            const y = [mcl.g2ToBN(pubkey)[2], mcl.g2ToBN(pubkey)[3]];
            const uncompressed = await bls._pubkeyToUncompresed(compressed, y);
            const _pubkey = mcl.newG2();
            _pubkey.setStr(`1 ${utils_1.bigToHex(uncompressed[0])} ${utils_1.bigToHex(uncompressed[1])} ${utils_1.bigToHex(uncompressed[2])} ${utils_1.bigToHex(uncompressed[3])}`);
            assert.isTrue(_pubkey.isEqual(pubkey));
        }
    });
    it('signature to uncompressed', async function () {
        for (let i = 0; i < 20; i++) {
            const signature = mcl.randG1();
            const compressed = mcl.compressSignature(signature);
            const isValid = await bls._isValidCompressedSignature(compressed);
            assert.isTrue(isValid);
            const y = mcl.g1ToBN(signature)[1];
            const uncompressed = await bls._signatureToUncompresed(compressed, y);
            const _signature = mcl.newG1();
            _signature.setStr(`1 ${utils_1.bigToHex(uncompressed[0])} ${utils_1.bigToHex(uncompressed[1])}`);
            assert.isTrue(signature.isEqual(_signature));
        }
    });
    it('map to point, ti', async function () {
        mcl.setMappingMode(mcl.MAPPING_MODE_TI);
        for (let i = 0; i < 20; i++) {
            const data = utils_1.randHex(12);
            const e = utils_2.soliditySha256(['bytes'], [data]);
            let expect = mcl.g1ToHex(mcl.mapToPoint(e));
            let res = await bls._mapToPointTI(e);
            assert.equal(expect[0], utils_1.bigToHex(res[0]));
            assert.equal(expect[1], utils_1.bigToHex(res[1]));
        }
    });
    it('map to point, ft', async function () {
        mcl.setMappingMode(mcl.MAPPING_MODE_FT);
        for (let i = 0; i < 100; i++) {
            const e = utils_1.randFsHex();
            let expect = mcl.g1ToHex(mcl.mapToPoint(e));
            let res = await bls._mapToPointFT(e);
            assert.equal(expect[0], utils_1.bigToHex(res[0]), 'e ' + e);
            assert.equal(expect[1], utils_1.bigToHex(res[1]), 'e ' + e);
        }
    });
    it('expand message to 96', async function () {
        mcl.setMappingMode(mcl.MAPPING_MODE_FT);
        for (let j = 0; j < 2; j++) {
            for (let i = 0; i < 100; i++) {
                const msg = utils_2.randomBytes(i);
                const expected = hash_to_field_1.expandMsg(DOMAIN, msg, 96);
                const result = await bls._expandMsg(DOMAIN, msg);
                assert.equal(utils_2.hexlify(expected), result);
            }
        }
    });
    it('hash to field', async function () {
        mcl.setMappingMode(mcl.MAPPING_MODE_FT);
        for (let j = 0; j < 2; j++) {
            for (let i = 0; i < 100; i++) {
                const msg = utils_2.randomBytes(i);
                const expected = hash_to_field_1.hashToField(DOMAIN, msg, 2);
                const result = await bls._hashToField(DOMAIN, msg);
                assert.equal(utils_2.hexlify(expected[0]), utils_2.hexlify(result[0]));
                assert.equal(utils_2.hexlify(expected[1]), utils_2.hexlify(result[1]));
            }
        }
    });
    it('hash to point', async function () {
        mcl.setMappingMode(mcl.MAPPING_MODE_FT);
        for (let j = 0; j < 2; j++) {
            for (let i = 0; i < 100; i++) {
                const msg = utils_2.randomBytes(i);
                const expected = mcl.g1ToHex(mcl.hashToPoint(utils_2.hexlify(msg)));
                const result = await bls._hashToPoint(DOMAIN, msg);
                assert.equal(expected[0], utils_1.bigToHex(result[0]));
                assert.equal(expected[1], utils_1.bigToHex(result[1]));
            }
        }
    });
    it('verify aggregated signature', async function () {
        mcl.setMappingMode(mcl.MAPPING_MODE_TI);
        mcl.setDomain('testing evmbls');
        const n = 10;
        const messages = [];
        const pubkeys = [];
        let aggSignature = mcl.newG1();
        for (let i = 0; i < n; i++) {
            const message = utils_1.randHex(12);
            const { pubkey, secret } = mcl.newKeyPair();
            const { signature, M } = mcl.sign(message, secret);
            aggSignature = mcl.aggreagate(aggSignature, signature);
            messages.push(M);
            pubkeys.push(pubkey);
        }
        let messages_ser = messages.map((p) => mcl.g1ToBN(p));
        let pubkeys_ser = pubkeys.map((p) => mcl.g2ToBN(p));
        let sig_ser = mcl.g1ToBN(aggSignature);
        let res = await bls._verifyMultiple(sig_ser, pubkeys_ser, messages_ser);
        assert.isTrue(res);
    });
    it.only('verify single signature', async function () {
        mcl.setMappingMode(mcl.MAPPING_MODE_TI);
        mcl.setDomain('testing evmbls');
        const message = utils_1.randHex(12);
        const { pubkey, secret } = mcl.newKeyPair();
        const { signature, M } = mcl.sign(message, secret);
        let message_ser = mcl.g1ToBN(M);
        console.log(message_ser);
        let pubkey_ser = mcl.g2ToBN(pubkey);
        console.log(pubkey_ser);
        let sig_ser = mcl.g1ToBN(signature);
        console.log(sig_ser);
        let res = await bls._verifySingle(sig_ser, pubkey_ser, message_ser);
        assert.isTrue(res);
        console.log("Second test: Different message same keypair.")
        let newMessage = utils_2.hexlify(message);
        newMessage = utils_2.hexZeroPad(newMessage);
        newMessage = hashToPoint(newMessage);
        newMessage = mcl.g1ToBN(newMessage);
        console.log("New Message is: ", newMessage);
        //newMessage = utils_1.toBig(newMessage);
        // let pointMessage = mcl.hashToPoint(newMessage);
        // let BNmessage = mcl.g1ToBN(pointMessage);
        res = await bls._verifySingle(sig_ser, pubkey_ser, newMessage);
        assert.isTrue(res);
    });
});
//# sourceMappingURL=bls.test.js.map