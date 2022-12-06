"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wallet = exports.provider = void 0;
const ethers_1 = require("ethers");
const MNEMONIC = 'myth like bonus scare over problem client lizard pioneer submit female collect';
exports.provider = new ethers_1.providers.JsonRpcProvider('http://127.0.0.1:8545');
exports.wallet = ethers_1.Wallet.fromMnemonic(MNEMONIC).connect(exports.provider);
//# sourceMappingURL=provider.js.map