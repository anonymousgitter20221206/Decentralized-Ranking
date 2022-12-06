//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "./BLS.sol";
//Check reputation flow
//find a different way to generate cluster to randomize
//Remove reputation
//Rewards and stakes kept track only for oracles, funding is not taken into account in the implementation (Would come from HEI's and Clients, but not included currently)
struct Oracle {
  uint256 oracNo;
  //uint256 reputation;
  uint256 individTasks;
  uint256 cluster;
}
struct Cluster {
  uint256 clusterID;
  uint256 oracles;
  uint256 [10] rewards;// dependent on maxClusterSize
  uint256 completedTasks;
  address head;
  uint256 keySubTime;
  uint256[4] pubKey;
}
struct HEI {
  address HEIAddress; //if is the one registering
  string HEIName;
  uint256 assignedCluster;
  bool authenticated;
  string IPNS;
  uint256 result;
  bool[10] submitted;
  uint submissionCounter;
  uint endTime;
} // set a timer where ranking happens only once a year?

struct Score {
  string[10] metricData;
  uint256[10] metrics;
  uint256 aggScore;
}

contract Oracles is BLS {
  uint256 private stakeValue = 100000000000000000;
  uint256 private rewardValue = 10000000000000000;
  uint256 public heiID = 1;
  uint16 public metricsNumber = 10;
  uint256 public clusterCount = 0;
  uint16 private minClusterSize = 4;
  uint16 public constant maxClusterSize = 10;
  uint256 private refreshTime = 604800; 
  string private IPNSLink;
  address maintainer;
  
  modifier notOracle() {
    require(oracle[msg.sender].cluster == 0, "Registration denied, can only register once!");
    _;
  }
  modifier isOracle() {
    require(oracle[msg.sender].cluster != 0, "Operation denied, should be a registered oracle!");
    _;
  }

  modifier stake(uint16 _mul) {
    require(msg.value == stakeValue*_mul, "Registration denied, invalid stake amount!");
    _;
  }
  modifier validCluster() {
   require(cluster[oracle[msg.sender].cluster].oracles >= minClusterSize,"Cluster is invalid!");
    _;
  }

  mapping(address => HEI) hei;
  mapping(address => bool) registered;
  mapping(address => Score) score;
  mapping(uint256 => Cluster) cluster;
  mapping(address => Oracle) oracle;
  mapping(address => uint256) dataCluster;
  mapping(address => bool) submitted;

  constructor() {}

 

  function withdrawReward() isOracle public{//5
    require(cluster[oracle[msg.sender].cluster].rewards[oracle[msg.sender].oracNo]< cluster[oracle[msg.sender].cluster].completedTasks,"Invalid Cluster!");
    uint amount = cluster[oracle[msg.sender].cluster].completedTasks - cluster[oracle[msg.sender].cluster].rewards[oracle[msg.sender].oracNo];
    cluster[oracle[msg.sender].cluster].rewards[oracle[msg.sender].oracNo]+= amount;
    amount*=rewardValue;
    payable(msg.sender).transfer(amount);
  }

  function commitHEIData(
    address _dataOwner,
    address _heID,
    uint256 _metricOrder,
    uint256 _metricScore,
    string calldata _metricData,
    uint256[2] calldata _message,
    uint256[2] calldata _thresSig
  ) public isOracle {//7
    require(hei[_heID].assignedCluster != 0, "HEI is not being ranked!"); //ensure that hei is registered and is assigned a cluster
    require(dataCluster[_dataOwner] == oracle[msg.sender].cluster, "No such data linked to given cluster!");
    require(cluster[oracle[msg.sender].cluster].keySubTime > block.timestamp,"Have to refresh the public key before proceeding!");
    require(verifySingle(_thresSig, cluster[oracle[msg.sender].cluster].pubKey, _message), "Invalid signature!");
    score[_heID].metrics[_metricOrder] = _metricScore;
    score[_heID].metricData[_metricOrder] = _metricData; // _metricData[0] is the metric itself, and [1] is the data
    oracle[_dataOwner].individTasks++;
    delete dataCluster[_dataOwner];
    // bytes memory tempString = bytes(score[_heID].metricData[_metricOrder]);
    // if (tempString.length == 0)
  }



  event newData(address sender, uint256 cluster, string IPFS, uint8 _metricOrder);

  function newDataSubmission(
    address _heiID,
    string calldata _IPFSLink,
    uint8 _metricOrder
  ) public {//4
    require(hei[_heiID].assignedCluster != 0 && dataCluster[msg.sender] == 0, "Invalid request!"); //prevent submission to invalid cluster and prevent DoS through constat requests
    dataCluster[msg.sender] = hei[_heiID].assignedCluster;
    emit newData(msg.sender, hei[_heiID].assignedCluster, _IPFSLink, _metricOrder);
  }

  event gatherMetrics(address, uint256);

  function submitSurveyResult(
    address _heID,
    string calldata _surveyResults,
    uint256 _aggregatedValues
  ) public isOracle {//6
    require(hei[_heID].assignedCluster == oracle[msg.sender].cluster, "Invalid HEI selected!");
    Score memory tempscore;
    tempscore.metrics[score[_heID].metrics.length - 1] = _aggregatedValues;
    tempscore.metricData[score[_heID].metrics.length - 1] = _surveyResults;
    score[_heID] = tempscore;
    cluster[oracle[msg.sender].cluster].completedTasks += 2;
    emit gatherMetrics(_heID, hei[_heID].assignedCluster);
  }

  event SurveyTask(uint256 Cluster, string HEI);

  function initiateSurvey(uint256 _clusterID, address _HEID) public isOracle validCluster{//5
  require(hei[_HEID].assignedCluster == 0 && oracle[msg.sender].cluster == _clusterID && hei[_HEID].authenticated, "Invalid survey request, revise request!");
  require(cluster[oracle[msg.sender].cluster].keySubTime > block.timestamp,"Have to refresh the public key before proceeding!");
    //require(equals(_HEIName, hei[_HEID].HEIName), "Invalid Name!");
    hei[_HEID].assignedCluster = _clusterID;
    oracle[maintainer].individTasks += 2;
    //oracle[maintainer].reputation = (oracle[maintainer].reputation * 8 + 10000 * 2) / 10; // give reputation of 10,0000 for this transaction (equaivalent to 100 on 0-100 scale)
    emit SurveyTask(_clusterID, hei[_HEID].HEIName);
  }

  event AuthenticationMessage(string);

  function authenticateHEI(//6
    //address _heiAddress,
    address _heiID,
    //string calldata _heiName,
    uint8 _result,
    uint256[2] calldata _resultBn,
    uint256[2] calldata _thresSig
  ) public isOracle {
    require(_result == 0 || _result == 1,"Result has to either be 0 or 1!");
    require(hei[_heiID].submitted[oracle[msg.sender].oracNo],"Oracle already submitted!");
    require(_heiID == hei[_heiID].HEIAddress && !hei[_heiID].authenticated && cluster[oracle[msg.sender].cluster].oracles >= minClusterSize, "The specified HEI can not be authenticated!");
    require(cluster[oracle[msg.sender].cluster].keySubTime > block.timestamp,"Have to refresh the public key before proceeding!");
    require(verifySingle(_thresSig, cluster[oracle[msg.sender].cluster].pubKey, _resultBn),"The provided signature details are invalid");
    hei[_heiID].result+=_result;
    hei[_heiID].submissionCounter++;
    if(block.timestamp > hei[_heiID].endTime && hei[_heiID].submissionCounter > 6 || hei[_heiID].submissionCounter == maxClusterSize){
      if (_result > (hei[_heiID].submissionCounter/2)) {
        // result is 0 if false, >0 if true
        hei[_heiID].authenticated = true;
        emit AuthenticationMessage("The HEI is registered!");
      } else {
        delete hei[_heiID];
        emit AuthenticationMessage("The HEI is not registered!");
      }
      cluster[oracle[msg.sender].cluster].completedTasks++;
    }
  }

  function submitPubKey(uint256[4] calldata _pubkey) public isOracle {//3
    require(msg.sender == cluster[oracle[msg.sender].cluster].head, "Only oracle head can submit public key!");
    oracle[msg.sender].individTasks++;
    //oracle[msg.sender].reputation = (oracle[msg.sender].reputation * 8 + 10000 * 2) / 10; // give reputation of 10,0000 for this transaction (equaivalent to 100 on 0-100 scale)
    cluster[oracle[msg.sender].cluster].keySubTime = block.timestamp + refreshTime ;
    cluster[oracle[msg.sender].cluster].pubKey = _pubkey;
  }
  event AuthenticateHEI(string validationPath, string HEIName);
  function registerHEI(string memory _HEIName, string memory _validationPath, string memory _IPNS) public notOracle {//4
    require(hei[msg.sender].HEIAddress == address(0),"Registration can only be done once at a time!");
    HEI memory tempHEI;
    tempHEI.HEIName = _HEIName;
    tempHEI.HEIAddress = msg.sender;
    tempHEI.IPNS = _IPNS;
    tempHEI.endTime = block.timestamp + 3600;
    hei[msg.sender] = tempHEI;
    emit AuthenticateHEI(_validationPath, _HEIName);
  }

  event shareAccess(string PeerIDNotification);

  function setIPNSLink(string calldata _IPNSLink) public payable stake(5) isOracle {
    require(maintainer == address(0),"Maintainer already exists!");
    //require(msg.value >= (5 * stakeValue), "Invalid stake!");
    IPNSLink = _IPNSLink;
    maintainer = msg.sender;
    emit shareAccess("Share peerID with oracles!");
  }

  function registerOracle() public payable notOracle stake(1) { //6
    Oracle memory tempOracle;
    //tempOracle.orcAddr = msg.sender;
    //tempOracle.reputation = 5000;
    tempOracle.individTasks = 0;
    if (cluster[clusterCount].oracles >= maxClusterSize || clusterCount == 0) {
      generateCluster(msg.sender);
      //tempOracle.head = true;
    } else cluster[clusterCount].oracles++;
    tempOracle.cluster = clusterCount;
    tempOracle.oracNo = cluster[clusterCount].oracles-1;
    cluster[clusterCount].rewards[tempOracle.oracNo] = cluster[clusterCount].completedTasks;
    oracle[msg.sender] = tempOracle;
    registered[msg.sender] = true;
  }

  event NewCluster(uint256 clusterID, address head);

  function generateCluster(address _oracle) internal {
    clusterCount++;
    Cluster memory tempCluster;
    tempCluster.clusterID = clusterCount;
    tempCluster.oracles = 1;
    tempCluster.completedTasks = 0;
    tempCluster.head = _oracle;
    //oracleCluster[_oracle] = tempCluster.clusterID;
    cluster[clusterCount] = tempCluster;
    emit NewCluster(tempCluster.clusterID, _oracle);
  }

  function display(address _heiID) public view returns (string memory, address) {
    return (hei[_heiID].HEIName, hei[_heiID].HEIAddress);
  }

  function getOracleHead(uint256 _clusterCount) public view returns (address, address) {
    return (cluster[oracle[msg.sender].cluster].head, cluster[_clusterCount].head);
  }

  function equals(string memory a, string memory b) public pure returns (bool) {
    if (bytes(a).length != bytes(b).length) {
      return false;
    } else {
      return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
  }
}

 // function getAggScore(address _heid) public view returns (uint256 aggSum) {//?
  //   if (score[_heid].aggScore != 0) {
  //     return score[_heid].aggScore;
  //   } else {
  //     bytes memory tempString;
  //     uint256 sum = 0;
  //     uint8 length = 0;
  //     for (uint256 i = 0; i < score[_heid].metricData.length; i++) {
  //       tempString = bytes(score[_heid].metricData[i]);
  //       if (tempString.length > 0) {
  //         sum += score[_heid].metrics[i];
  //         length++;
  //       }
  //     }
  //     score[_heid].aggScore = sum / length;
  //     return score[_heid].aggScore;
  //   }
  // }