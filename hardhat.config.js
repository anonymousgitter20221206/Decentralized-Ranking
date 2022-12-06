/**
 * @type import('hardhat/config').HardhatUserConfig
 */
/**
 */
 require("hardhat-tracer");
 require("hardhat-gas-reporter");
 
 //require("@nomiclabs/hardhat-waffle");
 require("@nomicfoundation/hardhat-chai-matchers")
 
 module.exports = {
   gasReporter: {
     currency: 'USD',
     gasPrice: 21,
     coinmarketcap: '585d1770-7598-4f26-9d12-aff7d4678e34'
   },//Mining interval is adjusted to test the run-time for the implementation, only works for the original test
  //  networks: {
  //    hardhat: {
  //      mining: {
  //        auto: false,
  //        interval: 20000
  //      },
  //      accounts: {
  //        count: 30
  //      }
  //    }
  //  },
   solidity: {
     version: "0.8.15",
     settings: {
       optimizer:{
         enabled: true,
         runs : 1000,
       }
     }
   }
 };
 
 