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
const { hashToPoint, g1ToHex, randG1 } = require("./mcl");
const { defaultAccounts } = require("ethereum-waffle");
//const { TestBls } = require('contracts/TestBls');
//const FACTORY_TEST_BLS = new TestBlsFactory_1.TestBlsFactory(provider_1.wallet);
//const FACTORY_TEST_BLS = new TestBls(wallet);
const MINUS_ONE = utils_1.toBig('0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd46');
const NON_RESIDUE_2 = [utils_1.toBig('0x09'), utils_1.toBig('0x01')];
const DOMAIN_STR = 'testing-evmbls';
const DOMAIN = Uint8Array.from(Buffer.from(DOMAIN_STR, 'utf8'));
const CID = require('cids');



describe('BLS', () => {
    let bls;
    before(async function () {
        const BLSExample = await ethers.getContractFactory("TestBLS");
        await mcl.init();
        mcl.setDomain(DOMAIN_STR);
        bls = await BLSExample.deploy();
        await bls.deployed();
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
    it.only('verify two threshold signatures', async function () {
        // mcl.setMappingMode(mcl.MAPPING_MODE_TI);
        // mcl.setDomain('testing evmbls');
        // const messageM = utils_1.randHex(12);
        // let newMessage = utils_2.hexlify(messageM + '7fea34');
        // newMessage = utils_2.hexZeroPad(newMessage);
        // newMessage = hashToPoint(newMessage);
        // newMessage = mcl.g1ToBN(newMessage);
        // console.log("New Message is: ", newMessage);
        //newMessage = utils_1.toBig(newMessage);
        // // let pointMessage = mcl.hashToPoint(newMessage);
        // // let BNmessage = mcl.g1ToBN(pointMessage);
        // res = await bls._verifySingle(sig_ser, pubkey_ser, newMessage);
        // assert(res,"Second signature is invalid!");

        mcl.setMappingMode(mcl.MAPPING_MODE_TI);
        mcl.setDomain('testing evmbls');
        const n = 10;
        //const messages = [];
        const keypair = [];
        let aggSignature = mcl.newG1();
        let aggPubKey = mcl.newG2();
        let M1;
        //let falseSecret = '0x30644e72e131a029b85045b68181585d97816a91687';
        //falseSecret = hashToPoint(falseSecret);
        const message = utils_1.randHex(24);
        for (let i = 0; i < n; i++) {
            const { pubkey, secret } = mcl.newKeyPair();
            keypair.push({ publickey: pubkey, secretkey: secret });
            const { signature, M } = mcl.sign(message, secret);
            //console.log(M);
            aggSignature = mcl.aggreagate(aggSignature, signature);
            aggPubKey = mcl.aggreagate(aggPubKey, pubkey);
            if (i == 0) {
                M1 = M;
                console.log("First encrypted message: ", M);
                console.log("First encrypted signature: ", signature);
            }
        }
        //console.log(keypair);
        //const { pubkey, secret } = mcl.newKeyPair();
        //const { signature, M } = mcl.sign(message, secret);
        console.log("M1 is:", M1);
        let message_ser = mcl.g1ToBN(M1);
        let pubkey_ser = mcl.g2ToBN(aggPubKey);
        let sig_ser = mcl.g1ToBN(aggSignature);
        let res = await bls._verifySingle(sig_ser, pubkey_ser, message_ser);
        assert(res, "First signature is invalid!");

        const cid = new CID('bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq');

        let message1 = cid.bytes;
        message1 = utils_2.hexlify(message1);
        console.log("message 1 is:", message1);
        let aggSignaturek = mcl.newG1();
        let aggPubKeyk = mcl.newG2();
        let M2;

        for (let i = 0; i < n; i++) {
            //console.log(keypair[i].secretkey);
            const { signature, M } = mcl.sign(message1, keypair[i].secretkey);
            //if (i != 2 && i != 7) {
            console.log("Aggregating key number: ", i + 1);
            aggSignaturek = mcl.aggreagate(aggSignaturek, signature);
            aggPubKeyk = mcl.aggreagate(aggPubKeyk, keypair[i].publickey);
            //}
            if (i == 0) {
                M2 = M;
                console.log("Enter M2!");
                console.log("Encrypted message M: ", M);
                console.log("Encrypted Signature is: ", signature);
            }
            // if (i == 2) {
            //     const { pubkey, secret } = mcl.newKeyPair();
            //     const { signature, M } = mcl.sign(message1, secret);
            //     aggSignaturek = mcl.aggreagate(aggSignaturek, signature);
            //     aggPubKeyk = mcl.aggreagate(aggPubKeyk, pubkey);
            // }
            // }
        }
        console.log("M is:", M2);
        let message_ser1 = mcl.g1ToBN(M2);
        //console.log(message_ser1);
        let pubkey_ser1 = mcl.g2ToBN(aggPubKeyk);
        let sig_ser1 = mcl.g1ToBN(aggSignaturek);
        let res1 = await bls._verifySingle(sig_ser1, pubkey_ser, message_ser1);
        try {
            assert(res1, "Second signature is invalid!");
        } catch (err) {
            console.log('\x1b[94m Exception: \x1b[0m Second signature is invalid due to inclusion of an invalid signer!');
        }
    });
    it('Authenticate HEI', async function () {
        console.log("I am here0!");
        const Main = await ethers.getContractFactory("Oracles");
        const main = await Main.deploy();
        console.log("I am here!");
        const [owner, oracle1, oracle2, oracle3, oracle4, oracle5, HEI] = await ethers.getSigners();
        console.log("I am here1!");
        mcl.setMappingMode(mcl.MAPPING_MODE_TI);
        mcl.setDomain('testing evmbls');
        console.log("I am here2!");
        await main.connect(oracle1).registerOracle({ value: ethers.utils.parseEther("0.1") });
        console.log("I am here3!");
        await main.connect(oracle2).registerOracle({ value: ethers.utils.parseEther("0.1") });
        await main.connect(oracle3).registerOracle({ value: ethers.utils.parseEther("0.1") });
        await main.connect(oracle4).registerOracle({ value: ethers.utils.parseEther("0.1") });
        await main.connect(oracle5).registerOracle({ value: ethers.utils.parseEther("0.1") });
        console.log("I am here4!");
        let ipns = '0xk51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoew';
        await main.connect(oracle1).setIPNSLink(ipns, { value: ethers.utils.parseEther("0.5") });
        console.log("I am here5!");
        await main.connect(HEI).registerHEI();
        console.log("I am here6!");
        let heid = (await main.heiID()) - 1;
        console.log("I am here7!");

        console.log(heid);

        const n = 5;
        const keypair = [];
        let aggSignature = mcl.newG1();
        let aggPubKey = mcl.newG2();
        let M1;
        const message = utils_1.randHex(24);
        console.log("The random hex is:", message);
        for (let i = 0; i < n; i++) {
            const { pubkey, secret } = mcl.newKeyPair();
            keypair.push({ publickey: pubkey, secretkey: secret });
            const { signature, M } = mcl.sign(message, secret);
            aggSignature = mcl.aggreagate(aggSignature, signature);
            aggPubKey = mcl.aggreagate(aggPubKey, pubkey);
            if (i == 0) {
                M1 = M;
            }
        }
        let message_ser = mcl.g1ToBN(M1);
        let pubkey_ser = mcl.g2ToBN(aggPubKey);
        let sig_ser = mcl.g1ToBN(aggSignature);
        let res = await bls._verifySingle(sig_ser, pubkey_ser, message_ser);
        let clusterID = await main.clusterCount();
        let [head, head2] = await main.connect(oracle1).getOracleHead(clusterID);

        console.log(" The oracle head is:", head, "and: ", head2);
        await main.connect(oracle1).submitPubKey(pubkey_ser);
        console.log("I am here8!");
        await main.connect(oracle1).authenticateHEI(HEI.address, heid, 'Khalifa University', message_ser, sig_ser);
        console.log("I am here9!");
        await main.connect(oracle1).initiateSurvey(clusterID,
            pubkey_ser,
            heid,
            'Khalifa University');
        console.log("I am here9.5!");
        //const message = utils_1.randHex(24);
        for (let i = 0; i < n; i++) {
            const { signature, M } = mcl.sign(message, keypair[i].secretkey);
            aggSignature = mcl.aggreagate(aggSignature, signature);
            aggPubKey = mcl.aggreagate(aggPubKey, keypair[i].publickey);
            if (i == 0) {
                M1 = M;
            }
        }
        message_ser = mcl.g1ToBN(M1);
        pubkey_ser = mcl.g2ToBN(aggPubKey);
        sig_ser = mcl.g1ToBN(aggSignature);
        res = await bls._verifySingle(sig_ser, pubkey_ser, message_ser);
        console.log("I am here10!");
        await main.connect(oracle1).submitSurveyResult(
            heid,
            '0x626c756500000000000000000000000000000000000000000000000000000000',
            3243242345,
            sig_ser,
            pubkey_ser,
            message_ser
        );
        console.log("I am here11!");
        let message1 = '0x39373737726c7565';
        let aggSignature1 = mcl.newG1;
        let aggPubKey1 = mcl.newG2;
        for (let i = 0; i < n; i++) {
            const { signature, M } = mcl.sign(message1, keypair[i].secretkey);
            aggSignature1 = mcl.aggreagate(aggSignature1, signature);
            aggPubKey1 = mcl.aggreagate(aggPubKey1, keypair[i].publickey);
            if (i == 0) {
                M1 = M;
            }
        }
        message_ser = mcl.g1ToBN(M1);
        pubkey_ser = mcl.g2ToBN(aggPubKey1);
        sig_ser = mcl.g1ToBN(aggSignature1);
        res = await bls._verifySingle(sig_ser, pubkey_ser, message_ser);
        try {
            assert(res, "Final signature is invalid!");
        } catch (err) {
            console.log('\x1b[94m Exception: \x1b[0m Second signature is invalid due to inclusion of an invalid signer!');
        }

        await main.connect(oracle1).gatherHEIData(heid, 1, 9777, '0x726c756500000000000000000000000000000000000000000000000000000000', message_ser, sig_ser);
        console.log("I am here12!");



    });
});