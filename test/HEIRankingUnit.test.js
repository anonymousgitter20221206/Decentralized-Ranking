"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcl = require("./mcl");
const utils_1 = require("./utils");
const {expect , assert } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const utils_2 = require("ethers/lib/utils");
const { ethers } = require("hardhat");
const DOMAIN_STR = 'testing-evmbls';
const CID = require('cids');

describe('BLS', () => {
    //setup
    let bls;
    let main;
    let accounts;
    before(async function () {
        const BLSExample = await ethers.getContractFactory("TestBLS");
        await mcl.init();
        mcl.setDomain(DOMAIN_STR);
        const Main = await ethers.getContractFactory("Oracles");
        main = await Main.deploy();
        bls = await BLSExample.deploy();
        await bls.deployed();
        await main.deployed();
        accounts = await ethers.getSigners();
    });
    // 
    const keypair = [];
    let pubkey_ser;
    const n = 5;
    const stake = '0.1';
    
    it('Register Oracles with a stake', async function () {
        //Adjust the oracle accounts according to the number n
        //Register 5 oracles with stake of 0.1ETH each
        await expect (main.connect(accounts[1]).registerOracle({ value: ethers.utils.parseEther('0.1') })).to.emit(main,"NewCluster").withArgs(1,accounts[1].address);//First oracle should generate new cluster
        await main.connect(accounts[2]).registerOracle({ value: ethers.utils.parseEther('0.1') });
        await main.connect(accounts[3]).registerOracle({ value: ethers.utils.parseEther('0.1') });
        await main.connect(accounts[4]).registerOracle({ value: ethers.utils.parseEther('0.1') });
        await main.connect(accounts[5]).registerOracle({ value: ethers.utils.parseEther('0.1') });

        await expect(main.connect(accounts[6]).registerOracle({ value: ethers.utils.parseEther('0.05') })).to.be.reverted//With("Registration denied, invalid stake amount!");
        await expect(main.connect(accounts[5]).registerOracle({ value: ethers.utils.parseEther('0.1') })).to.be.revertedWith("Registration denied, can only register once!");
        
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from registering due to insufficient stake!');
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from registering again in the same cluster!');

        //We now try to fill the cluster to generate a new one
        for(let i = 11;i<16;i++){
            await main.connect(accounts[i]).registerOracle({ value: ethers.utils.parseEther('0.1') });
        }

        //Oracle 11 (accounts[16]) should be the first oracle of the second cluster, clusterID should be 2
        await expect (main.connect(accounts[16]).registerOracle({ value: ethers.utils.parseEther('0.1') })).to.emit(main,"NewCluster").withArgs(2,accounts[16].address);//First oracle should generate new cluster
        await main.connect(accounts[17]).registerOracle({ value: ethers.utils.parseEther('0.1') });//First oracle should generate new cluster

        //Oracle from cluster 1 attempts to register in cluster 2
        await expect(main.connect(accounts[2]).registerOracle({ value: ethers.utils.parseEther('0.1') })).to.be.revertedWith("Registration denied, can only register once!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from registering again to a new cluster!');
        
    });
    it('Set the IPNS', async function () {
        //IPNS link
        let ipns = '0xk51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoew';
        //Oracle Head submits the IPNS link
            await expect( main.connect(accounts[6]).setIPNSLink(ipns, { value: ethers.utils.parseEther(('0.5')) })).to.be.revertedWith("Operation denied, should be a registered oracle!");
        
            console.log('\x1b[94m Handled Exception: \x1b[0m Account is not an oracle, prevented from submitting IPNS link!');
            await expect(main.connect(accounts[3]).setIPNSLink(ipns, { value: ethers.utils.parseEther(('0.2')) })).to.be.revertedWith("Registration denied, invalid stake amount!");
        
            console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from submitting IPNS link due to insufficient stake!'); 
            await main.connect(accounts[1]).setIPNSLink(ipns, { value: ethers.utils.parseEther(('0.5')) });

            await expect(main.connect(accounts[3]).setIPNSLink(ipns, { value: ethers.utils.parseEther(('0.5')) })).to.be.revertedWith("Maintainer already exists!");
            console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from becoming new maintainer, maintainer already exists!');
    });
    let heid, heidAddress;
    let clusterID;
    let message_serInvalid;
    let M1;
    it('Process HEI registration request and authenticate using oracles', async function () {
        //Attempt to register as an HEI
        await main.connect(accounts[6]).registerHEI('Khalifa University', 'https://www.ku.ac.ae', 'k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoqw');
        //Attempt to register again
        await expect(main.connect(accounts[6]).registerHEI('Khalifa University', 'https://www.ku.ac.ae', 'k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoqw')).to.be.revertedWith("Registration can only be done once at a time!");
        console.log('\x1b[94m Handled Exception: \x1b[0m HEI prevented from submitting registration again!');

        //oracle attempts to register
        await expect(main.connect(accounts[3]).registerHEI('Khalifa University', 'https://www.ku.ac.ae', 'k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoqw')).to.be.rejectedWith("Registration denied, can only register once!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from submitting an HEI request!');

        //Update HEID count
        heid = (await main.heiID()) - 1;
        heidAddress = accounts[6].address;


        //mcl.setMappingMode(mcl.MAPPING_MODE_TI);


        //Initiate the required cryptosystem for signing the transaction

        //Valid cryptosystem
        let aggSignature = mcl.newG1();
        let aggPubKey = mcl.newG2();
        let message = utils_2.hexlify(1); 
        let message_BN;

        //Invalid cryptosystem
        let aggSignatureInvalid = mcl.newG1();
        let aggPubKeyInvalid = mcl.newG2();
        let messageInvalid = utils_2.hexlify(2);
        let messageInvalid_BN;
        //Generate keypairs, and sign preliminary random value to validate correct functionality
        for (let i = 0; i < n; i++) {
            const { pubkey, secret } = mcl.newKeyPair();
            keypair.push({ publickey: pubkey, secretkey: secret });
            const { signature, M } = mcl.sign(message, secret);
            aggSignature = mcl.aggreagate(aggSignature, signature);
            aggPubKey = mcl.aggreagate(aggPubKey, pubkey);
            message_BN = M;
            if (i == 0) {
                //First signer signs a different message
                const { signature, M} = mcl.sign(messageInvalid, secret);
                aggSignatureInvalid = mcl.aggreagate(aggSignature, signature);
                aggPubKeyInvalid = mcl.aggreagate(aggPubKey, pubkey);
                messageInvalid_BN = M;
            } else {
                //Other signers execute the expected behaviour
                aggSignatureInvalid = mcl.aggreagate(aggSignature, signature);
                aggPubKeyInvalid = mcl.aggreagate(aggPubKey, pubkey);
            }
        }
        //Valid signed message, signature, public key and verification result
        let message_ser = mcl.g1ToBN(message_BN);
        pubkey_ser = mcl.g2ToBN(aggPubKey);
        let sig_ser = mcl.g1ToBN(aggSignature);
        let result = await bls._verifySingle(sig_ser, pubkey_ser, message_ser);
        assert(result, "Valid signature was rejected!");
        
        
        console.log('\x1b[94m Handled Exception: \x1b[0m A submitted aggregate signature is rejected due to message inconsistency!');
        
        //Get cluster count and the head
        clusterID = 1;
        //let [head, head2] = await main.connect(accounts[1]).getOracleHead(clusterID);
        //Normal oracle from the cluster attempts to submit key
        await expect(main.connect(accounts[3]).submitPubKey(pubkey_ser)).to.be.revertedWith("Only oracle head can submit public key!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from submitting public key as it is not oracle cluster head!');
        //HEI attempts to submit key
        await expect(main.connect(accounts[6]).submitPubKey(pubkey_ser)).to.be.revertedWith("Operation denied, should be a registered oracle!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Account prevented from submitting public key as it is not oracle cluster head!');
        await expect(main.connect(accounts[17]).submitPubKey(pubkey_ser)).to.be.revertedWith("Only oracle head can submit public key!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle from different cluster prevented from submitting public key!');
        //Head submits the cluster public key
        await main.connect(accounts[1]).submitPubKey(pubkey_ser);

        //Invalid signed message, signature, public key and verification result
        message_serInvalid = mcl.g1ToBN(messageInvalid_BN);
        let pubkey_serInvalid = mcl.g2ToBN(aggPubKeyInvalid);
        let sig_serInvalid = mcl.g1ToBN(aggSignatureInvalid);
        let resultInvalid = await bls._verifySingle(sig_serInvalid, pubkey_ser, message_ser);
        assert(!resultInvalid, "Invalid signature was verified!");
        
        await expect( main.connect(accounts[1]).authenticateHEI(accounts[6].address, message, message_serInvalid, sig_ser)).to.be.revertedWith("The provided signature details are invalid");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from authenticating due to invalid message!');
        await expect( main.connect(accounts[1]).authenticateHEI(accounts[6].address, message, message_ser, sig_serInvalid)).to.be.revertedWith("The provided signature details are invalid");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from authenticating due to invalid signature!');
        await expect( main.connect(accounts[16]).authenticateHEI(accounts[6].address, message, message_ser, sig_ser)).to.be.revertedWith("The specified HEI can not be authenticated!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from authenticating HEI when cluster not authorized!');
        await expect( main.connect(accounts[1]).authenticateHEI(accounts[7].address, message, message_ser, sig_ser)).to.be.revertedWith("The specified HEI can not be authenticated!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from authenticating an invalid HEI!');
        await time.increase(604800);
        await expect(main.connect(accounts[1]).authenticateHEI(accounts[6].address, message, message_ser, sig_ser)).to.be.revertedWith("Have to refresh the public key before proceeding!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from authenticating due to public key timeout!');
        //resubmit key (same key for testing)
        await main.connect(accounts[1]).submitPubKey(pubkey_ser);
        //Send the transaction for authenticating the HEI with ID and aggregated signature
        await main.connect(accounts[1]).authenticateHEI(accounts[6].address, message, message_ser, sig_ser);
    });
    it('Conduct survey and submit results', async function () {
        
        await expect( main.connect(accounts[8]).initiateSurvey(clusterID, heidAddress)).to.be.reverted;
        console.log('\x1b[94m Handled Exception: \x1b[0m Account prevented from initiating a survey, should be an oracle!');

        await expect( main.connect(accounts[16]).initiateSurvey(clusterID, heidAddress)).to.be.revertedWith("Cluster is invalid!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from initiating a survey with an invalid cluster!');

        await main.connect(accounts[7]).registerHEI('XYZ University', 'https://www.XYZ.ac.com', 'k51qzi5uqu5dkkciu33khkzbcmxtyhn376i1e83tya8kuy7z9euedzyr5nhoqw');
        
        await expect( main.connect(accounts[4]).initiateSurvey(clusterID, accounts[7].address)).to.be.revertedWith("Invalid survey request, revise request!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from initiating a survey for an unauthenticated HEI!');
        
        // await expect( main.connect(accounts[4]).initiateSurvey(clusterID, heidAddress)).to.be.revertedWith("Invalid survey request, revise request!");
        // console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from initiating a survey for an unauthenticated HEI!');

        
        await expect( main.connect(accounts[4]).initiateSurvey(clusterID+1, heidAddress)).to.be.revertedWith("Invalid survey request, revise request!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from initiating a survey on behalf of another cluster!');

        await time.increase(604800);
        await expect(main.connect(accounts[1]).initiateSurvey(clusterID, heidAddress)).to.be.revertedWith("Have to refresh the public key before proceeding!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from initiating the survey due to public key timeout!');

        //resubmit key (same key for testing)
        await main.connect(accounts[1]).submitPubKey(pubkey_ser);
        //Initiate request to gather survey results from surveyees 
        await expect( main.connect(accounts[1]).initiateSurvey(clusterID, heidAddress)).not.to.be.reverted;

        await expect( main.connect(accounts[4]).initiateSurvey(clusterID, heidAddress)).to.be.revertedWith("Invalid survey request, revise request!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle prevented from initiating a survey for an HEI that has an assigned cluster!');

        //IPFS link for the survey result
        let aggSignatureS = mcl.newG1();
        let aggPubKeyS = mcl.newG2();
        let aggSignatureSInv = mcl.newG1();
        let aggPubKeySInv = mcl.newG2();
        const cid = new CID('bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq');
        let messageS = cid.bytes ;
        messageS = utils_2.hexlify(messageS);
        let messageSInv = utils_1.randHex(12);
        //Sign result
        for (let i = 0; i < n; i++) {
            const { signature, M } = mcl.sign(messageS, keypair[i].secretkey);
            aggSignatureS = mcl.aggreagate(aggSignatureS, signature);
            aggPubKeyS = mcl.aggreagate(aggPubKeyS, keypair[i].publickey);
            if (i == 0) {
                M1 = M;
                const { pubkey, secret } = mcl.newKeyPair();
                const { signature, MM } = mcl.sign(messageS, secret);
                aggSignatureSInv = mcl.aggreagate(aggSignatureSInv, signature);
                aggPubKeySInv = mcl.aggreagate(aggPubKeySInv, pubkey);
            } else {
                aggSignatureSInv = mcl.aggreagate(aggSignatureSInv, signature);
                aggPubKeySInv = mcl.aggreagate(aggPubKeySInv, keypair[i].publickey);
            }
        }

        let message_serS = mcl.g1ToBN(M1);
        //let pubkey_serS = mcl.g2ToBN(aggPubKeyS); //public key doesnt change, already submitted by function
        let sig_serS = mcl.g1ToBN(aggSignatureS);
        let resultS = await bls._verifySingle(sig_serS, pubkey_ser, message_serS);
        assert(resultS, "Final signature is invalid!");

        let sig_serSInv = mcl.g1ToBN(aggSignatureSInv);
        let resultSInv = await bls._verifySingle(sig_serSInv, pubkey_ser, message_serS);
        assert(!resultSInv, "Invalid signature was verified!");
        
        //console.log('\x1b[94m Handled Exception: \x1b[0m A submitted aggregate signature is rejected due to invalid signer inclusion!');
        
        await expect(main.connect(accounts[16]).submitSurveyResult(
            heidAddress,
            'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq',
            3243242345,
            sig_serS,
            message_serS
        )).to.be.revertedWith("Invalid threshold signature!");

        console.log('\x1b[94m Handled Exception: \x1b[0m Survey result rejected due to a non-cluster oracle call!');
        //Invalid HEI
        // await expect(main.connect(accounts[1]).submitSurveyResult(
        //     accounts[7].address,
        //     'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq',
        //     3243242345,
        //     sig_serS,
        //     message_serS
        // )).to.be.revertedWith("Invalid HEI selected!");
        // console.log('\x1b[94m Handled Exception: \x1b[0m Survey result rejected due to invalid HEI selection!');
        //Invalid HEI
        await expect(main.connect(accounts[1]).submitSurveyResult(
            accounts[7].address,
            'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq',
            3243242345,
            sig_serS,
            message_serS
        )).to.be.revertedWith("Invalid HEI selected!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Survey result rejected due to invalid HEI selection!');

        //Invalid message
        await expect(main.connect(accounts[1]).submitSurveyResult(
            heidAddress,
            'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq',
            3243242345,
            sig_serS,
            message_serInvalid
        )).to.be.revertedWith("Invalid threshold signature!");
        console.log('\x1b[94m Handled Exception: \x1b[0m A submitted aggregate signature is rejected due to invalid message!');

        //Invalid signature
        await expect(main.connect(accounts[1]).submitSurveyResult(
            heidAddress,
            'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq',
            3243242345,
            sig_serSInv,
            message_serS
        )).to.be.revertedWith("Invalid threshold signature!");
        console.log('\x1b[94m Handled Exception: \x1b[0m A submitted aggregate signature is rejected due to invalid signature!');

        await expect(main.connect(accounts[1]).submitSurveyResult(
            heidAddress,
            'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq',
            3243242345,
            sig_serS,
            message_serS
        )).not.to.be.reverted;
    });
    it('Submit new HEI data by oracles', async function () {
        clusterID = await main.clusterCount();
        await main.connect(accounts[8]).newDataSubmission(heidAddress, 'Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu', 1);
        
        await expect(main.connect(accounts[8]).newDataSubmission(heidAddress, 'Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu', 1)).to.be.revertedWith("Invalid request!");
        
        console.log('\x1b[94m Handled Exception: \x1b[0m Account already submitted HEI data!');

        await expect(main.connect(accounts[9]).newDataSubmission(accounts[19].address, 'Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu', 1)).to.be.revertedWith("Invalid request!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Prevented from submitting data for an invalid HEI!');

        

        //Concate function parameters to be signed
        let heidData = parseInt(heid + "" + 1 + "" + 9777, 10);
        //heidData = utils_1.bigToHex(heidData);
        let messageK = utils_2.hexlify(heidData);
        messageK = utils_2.hexZeroPad(messageK);
        //const message1 = utils_1.randHex(12);
        let aggSignaturek = mcl.newG1();
        let aggPubKeyk = mcl.newG2();
        let aggSignatureKInv = mcl.newG1();
        let M2;
        for (let i = 0; i < n; i++) {
            const { signature, M } = mcl.sign(messageK, keypair[i].secretkey);
            aggSignaturek = mcl.aggreagate(aggSignaturek, signature);
            aggPubKeyk = mcl.aggreagate(aggPubKeyk, keypair[i].publickey);
            aggSignatureKInv = mcl.aggreagate(aggSignatureKInv, signature);
            if (i == n - 1) {
                M2 = M;
                const { pubkey, secret } = mcl.newKeyPair();
                const { signature, MM } = mcl.sign(messageK, secret);
                aggSignatureKInv = mcl.aggreagate(aggSignatureKInv, signature);
                //aggPubKeySInv = mcl.aggreagate(aggPubKeySInv, pubkey);

            }
        }
        let message_ser1 = mcl.g1ToBN(M2);
        let pubkey_ser1 = mcl.g2ToBN(aggPubKeyk);
        let sig_ser1 = mcl.g1ToBN(aggSignaturek);
        let sig_ser1Inv = mcl.g1ToBN(aggSignatureKInv);
        let res1 = await bls._verifySingle(sig_ser1, pubkey_ser, message_ser1);
        let res2 = await bls._verifySingle(sig_ser1Inv, pubkey_ser, message_ser1);
        assert(res1, "Final signature is invalid!");
        
        assert(!res2, "An invalid signature has been verified!");
        
        //console.log('\x1b[94m Handled Exception: \x1b[0m Aggregate signature is invalid due to inclusion of an invalid signer!');
        //Invalid oracle
        await expect(main.connect(accounts[16]).commitHEIData(accounts[8].address, heidAddress, 1, 9777, messageK, message_ser1, sig_ser1)).to.be.revertedWith("No such data linked to given cluster!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Data commit rejected due to invalid oracle!');


        //Invalid Data Owner
        await expect(main.connect(accounts[1]).commitHEIData(accounts[7].address, heidAddress, 1, 9777, messageK, message_ser1, sig_ser1)).to.be.revertedWith("No such data linked to given cluster!");
        
        console.log('\x1b[94m Handled Exception: \x1b[0m Data commit rejected due to providing invalid data owner!');
        

       //Invalid HEI
        await expect(main.connect(accounts[1]).commitHEIData(accounts[8].address, accounts[10].address, 1, 9777, messageK, message_ser1, sig_ser1)).to.be.revertedWith("HEI is not being ranked!");
        
        console.log('\x1b[94m Handled Exception: \x1b[0m Data commit rejected, invalid HEI!');
        //Invalid message
        await expect(main.connect(accounts[1]).commitHEIData(accounts[8].address, heidAddress, 1, 9777, messageK, message_serInvalid, sig_ser1)).to.be.revertedWith("Invalid signature!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Data commit rejected, invalid message!');
        //Invalid signature
        await expect(main.connect(accounts[1]).commitHEIData(accounts[8].address, heidAddress, 1, 9777, messageK, message_ser1, sig_ser1Inv)).to.be.revertedWith("Invalid signature!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Data commit rejected, invalid signature!');
        
        await time.increase(604800);
        await expect(main.connect(accounts[1]).commitHEIData(accounts[8].address, heidAddress, 1, 9777, messageK, message_ser1, sig_ser1)).to.be.revertedWith("Have to refresh the public key before proceeding!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Data commit rejected, public key refresh required!');
        await main.connect(accounts[1]).submitPubKey(pubkey_ser);

        //'0x726c756500000000000000000000000000000000000000000000000000000000'
        await main.connect(accounts[1]).commitHEIData(accounts[8].address, heidAddress, 1, 9777, messageK, message_ser1, sig_ser1);
    });
    it('Withdraw oracle rewards', async function () {
        await expect(main.connect(accounts[16]).withdrawReward()).to.be.revertedWith("Invalid Cluster!");
        console.log('\x1b[94m Handled Exception: \x1b[0m Oracle not allowed to withdraw reward, did not complete tasks!');
        var initBalance = await accounts[3].getBalance();
        await main.connect(accounts[3]).withdrawReward();
        var finalBalance = await accounts[3].getBalance();
        assert(finalBalance > initBalance,"A valid oracle was not able to withdraw reward!")
    });
});




