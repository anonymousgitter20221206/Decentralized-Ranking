"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcl = require("./mcl");
const utils_1 = require("./utils");
//const TestBlsFactory_1 = require("../types/ethers-contracts/TestBlsFactory");
const provider_1 = require("./provider");
//const {expect,assert} = require("@nomicfoundation/hardhat-chai-matchers");
const {expect , assert } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
//import { assert } from 'chai';
const utils_2 = require("ethers/lib/utils");
const hash_to_field_1 = require("./hash_to_field");
const { ethers } = require("hardhat");
const { hashToPoint, g1ToHex, randG1 } = require("./mcl");
//const { defaultAccounts } = require("ethereum-waffle");
//const { TestBls } = require('contracts/TestBls');
//const FACTORY_TEST_BLS = new TestBlsFactory_1.TestBlsFactory(provider_1.wallet);
//const FACTORY_TEST_BLS = new TestBls(wallet);
const MINUS_ONE = utils_1.toBig('0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd46');
const NON_RESIDUE_2 = [utils_1.toBig('0x09'), utils_1.toBig('0x01')];
const DOMAIN_STR = 'testing-evmbls';
const DOMAIN = Uint8Array.from(Buffer.from(DOMAIN_STR, 'utf8'));
const CID = require('cids');

describe('BLS', () => {
    //setup
    let bls;
    let main;
    before(async function () {
        const BLSExample = await ethers.getContractFactory("TestBLS");
        await mcl.init();
        mcl.setDomain(DOMAIN_STR);
        const Main = await ethers.getContractFactory("Oracles");
        main = await Main.deploy();
        bls = await BLSExample.deploy();
        await bls.deployed();
        await main.deployed();
    });
    // 
    const keypair = [];
    let pubkey_ser;
    const n = 5;
    const stake = '0.1';
    let accounts;
    it('Register Oracles with a stake', async function () {
        //Adjust the oracle accounts according to the number n
        accounts = await ethers.getSigners();
        //Register 5 oracles with stake of 0.1ETH each
        await main.connect(accounts[1]).registerOracle({ value: ethers.utils.parseEther('0.1') });
        await time.increase(30);
        await main.connect(accounts[2]).registerOracle({ value: ethers.utils.parseEther('0.1') });
        await time.increase(30);
        await main.connect(accounts[3]).registerOracle({ value: ethers.utils.parseEther('0.1') });
        await time.increase(30);
        await main.connect(accounts[4]).registerOracle({ value: ethers.utils.parseEther('0.1') });
        await time.increase(30);
        await main.connect(accounts[5]).registerOracle({ value: ethers.utils.parseEther('0.1') });
    });
    it('Set the IPNS', async function () {
        //IPNS link
        let ipns = '0xk51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoew';
        //Oracle Head submits the IPNS link
        await main.connect(accounts[1]).setIPNSLink(ipns, { value: ethers.utils.parseEther(('0.5')) });
    });
    let heid, heidAddress;
    let clusterID;
    let M1;
    it('Process HEI registration request and authenticate using oracles', async function () {
        //Attempt to register as an HEI
        await main.connect(accounts[6]).registerHEI('Khalifa University', 'https://www.ku.ac.ae', 'k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoqw');

        //Update HEID count
        heid = (await main.heiID()) - 1;
        heidAddress = accounts[6].address;


        mcl.setMappingMode(mcl.MAPPING_MODE_TI);


        //Initiate the required cryptosystem for signing the transaction
        //Valid cryptosystem
        let aggSignature = mcl.newG1();
        let aggPubKey = mcl.newG2();
        let message = 1; 
        message = utils_2.hexlify(message);
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
        //M1 = M;//Save the signed message
        let message_ser = mcl.g1ToBN(M1);
        pubkey_ser = mcl.g2ToBN(aggPubKey);
        let sig_ser = mcl.g1ToBN(aggSignature);
        let res = await bls._verifySingle(sig_ser, pubkey_ser, message_ser);
       
        //Get cluster count and the head
        clusterID = await main.clusterCount();
        //Head submits the cluster public key
        await main.connect(accounts[1]).submitPubKey(pubkey_ser);
        //Send the transaction for authenticating the HEI with ID and aggregated signature
        await main.connect(accounts[1]).authenticateHEI(accounts[6].address, message, message_ser, sig_ser);

    });
    it('Conduct survey and submit results', async function () {

        //Initiate request to gather survey results from surveyees 
        await main.connect(accounts[1]).initiateSurvey(clusterID, heidAddress);
        //IPFS link for the survey result
        let aggSignatureS = mcl.newG1();
        let aggPubKeyS = mcl.newG2();
        let aggSignatureSInv = mcl.newG1();
        let aggPubKeySInv = mcl.newG2();
        const cid = new CID('bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq');
        let messageS = cid.bytes ;
        messageS = utils_2.hexlify(messageS);
        //Sign result
        for (let i = 0; i < n; i++) {
            const { signature, M } = mcl.sign(messageS, keypair[i].secretkey);
            aggSignatureS = mcl.aggreagate(aggSignatureS, signature);
            aggPubKeyS = mcl.aggreagate(aggPubKeyS, keypair[i].publickey);
            if (i == 0) {
                M1 = M;
            } 
        }

        let message_serS = mcl.g1ToBN(M1);
        let pubkey_serS = mcl.g2ToBN(aggPubKeyS);
        let sig_serS = mcl.g1ToBN(aggSignatureS);
        let resS = await bls._verifySingle(sig_serS, pubkey_ser, message_serS);
        //Submit the survey result
        await main.connect(accounts[1]).submitSurveyResult(
            heidAddress,
            'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq',
            3243242345,
            sig_serS,
            message_serS
        );
    });
    it('Submit new HEI data by oracles', async function () {
        clusterID = await main.clusterCount();
        await main.connect(accounts[8]).newDataSubmission(heidAddress, 'Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu', 1);
        //Concate function parameters to be signed
        let heidData = parseInt(heid + "" + 1 + "" + 9777, 10);
        //heidData = utils_1.bigToHex(heidData);
        let messageK = utils_2.hexlify(heidData);
        messageK = utils_2.hexZeroPad(messageK);
        //const message1 = utils_1.randHex(12);
        let aggSignaturek = mcl.newG1();
        let aggPubKeyk = mcl.newG2();
        let M2;
        for (let i = 0; i < n; i++) {
            const { signature, M } = mcl.sign(messageK, keypair[i].secretkey);
            aggSignaturek = mcl.aggreagate(aggSignaturek, signature);
            aggPubKeyk = mcl.aggreagate(aggPubKeyk, keypair[i].publickey);
            if (i == n - 1) {
                M2 = M;
            }
        }
        let message_ser1 = mcl.g1ToBN(M2);
        let sig_ser1 = mcl.g1ToBN(aggSignaturek);
        let res1 = await bls._verifySingle(sig_ser1, pubkey_ser, message_ser1);
        //'0x726c756500000000000000000000000000000000000000000000000000000000'
        await main.connect(accounts[1]).commitHEIData(accounts[8].address, heidAddress, 1, 9777, messageK, message_ser1, sig_ser1);


    });
});




