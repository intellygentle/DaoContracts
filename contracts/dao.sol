// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FundingDAO {
 struct Proposal {
 string description;
 address nominee; // Address proposed to receive funds
 uint256 deadline;
 uint256 yesVotes;
 uint256 noVotes;
 bool executed;
 address proposer;
 }

 mapping(uint256 => Proposal) public proposals;
 mapping(address => uint256) public depositedAmount; // Tracks deposited MON
 mapping(address => uint256) public stakedAmount; // Tracks staked MON
 mapping(address => uint256) public votingPower; // Calculated voting power
 mapping(address => uint256) public voteDeposits; // Tracks vote deposits
 mapping(uint256 => mapping(address => bool)) public hasVoted;
 mapping(address => bool) public isWorthy; // Worthy candidates
 mapping(address => bool) public isWhitelisted; // Deployer-approved
 mapping(address => uint256) public lastProposalTime;

 uint256 public totalProposals;
 uint256 public votingDuration = 10 minutes;
 uint256 public proposalCooldown = 1 hours;
 uint256 public stakingMultiplier = 2; // 2x voting power for staked MON
 address public deployer;
 bool public fundsReturned = false; // Flag for refund eligibility

 modifier onlyDeployer() { require(msg.sender == deployer, "Not deployer"); _; }

 constructor() { deployer = msg.sender; }

 // Deposit MON to gain voting power (1x)
 function deposit() external payable {
 require(msg.value >= 0.001 ether, "Must deposit at least 0.001 MON");
 depositedAmount[msg.sender] += msg.value;
 votingPower[msg.sender] += msg.value; // 1x voting power for deposits
 }

 // Stake deposited MON for bonus voting power (2x total for staked portion)
 function stake(uint256 amount) external {
 require(depositedAmount[msg.sender] >= amount, "Not enough deposited");
 require(amount >= 0.001 ether, "Minimum stake 0.001 MON");
 depositedAmount[msg.sender] -= amount;
 stakedAmount[msg.sender] += amount;
 votingPower[msg.sender] += amount * (stakingMultiplier - 1); // Add 1x more (total 2x for staked)
 }

 // Unstake MON (allowed before voting or after funds returned)
 function unstake(uint256 amount) external {
 require(stakedAmount[msg.sender] >= amount, "Not enough staked");
 require(!isVotingActive() || fundsReturned, "Cannot unstake during voting");
 stakedAmount[msg.sender] -= amount;
 depositedAmount[msg.sender] += amount;
 votingPower[msg.sender] -= amount * (stakingMultiplier - 1); // Remove bonus power
 }

 // Signal interest in being a funding recipient
 function makeMeWorthy() external {
 require(depositedAmount[msg.sender] > 0 || stakedAmount[msg.sender] > 0, "Must deposit/stake");
 isWorthy[msg.sender] = true;
 }

 // Create a proposal to fund a worthy address
 function createProposal(string calldata description, address nominee) external {
 require(votingPower[msg.sender] > 0, "No voting power");
 require(isWorthy[nominee], "Nominee not worthy");
 require(block.timestamp >= lastProposalTime[msg.sender] + proposalCooldown , "Cooldown active");

 proposals[totalProposals] = Proposal({
 description: description,
 nominee: nominee,
 deadline: block.timestamp + votingDuration,
 yesVotes: 0,
 noVotes: 0,
 executed: false,
 proposer: msg.sender
 });
 lastProposalTime[msg.sender] = block.timestamp;
 totalProposals++;
 }

 // Vote with 0.001 MON deposit, no self-voting
 function vote(uint256 proposalId, bool support) external payable {
 Proposal storage proposal = proposals[proposalId];
 require(block.timestamp < proposal.deadline, "Voting ended");
 require(!hasVoted[proposalId][msg.sender], "Already voted");
 require(votingPower[msg.sender] > 0, "No voting power");
 require(msg.sender != proposal.nominee, "Cannot vote for yourself");
 require(msg.value == 0.001 ether, "Must deposit 0.001 MON to vote");

 hasVoted[proposalId][msg.sender] = true;
 voteDeposits[msg.sender] += msg.value;

 if (support) { proposal.yesVotes += votingPower[msg.sender]; }
 else { proposal.noVotes += votingPower[msg.sender]; }
 }

 // Deployer whitelists a winning nominee after voting
 function whitelistAddress(uint256 proposalId) external onlyDeployer {
 Proposal storage proposal = proposals[proposalId];
 require(block.timestamp >= proposal.deadline, "Voting still active");
 require(!proposal.executed, "Already executed");
 require(proposal.yesVotes > proposal.noVotes, "Did not pass");

 isWhitelisted[proposal.nominee] = true;
 }

 // Execute proposal and send funds to whitelisted address
 function executeProposal(uint256 proposalId) external {
 Proposal storage proposal = proposals[proposalId];
 require(isWhitelisted[proposal.nominee], "Not whitelisted");
 require(!proposal.executed, "Already executed");

 proposal.executed = true;
 uint256 fundingAmount = address(this).balance / 2; // Half the contract balance
 payable(proposal.nominee).transfer(fundingAmount);
 }

 // Mark funds as returned to enable deposit refunds
 function markFundsReturned() external onlyDeployer {
 fundsReturned = true;
 }

 // Withdraw vote deposits after funds are returned
 function withdrawVoteDeposit() external {
 require(fundsReturned, "Funds not returned yet");
 uint256 amount = voteDeposits[msg.sender];
 require(amount > 0, "No deposits to withdraw");
 voteDeposits[msg.sender] = 0;
 payable(msg.sender).transfer(amount);
 }

 // Withdraw deposited (non-staked) MON
 function withdrawDeposit(uint256 amount) external {
 require(depositedAmount[msg.sender] >= amount, "Not enough deposited");
 depositedAmount[msg.sender] -= amount;
 votingPower[msg.sender] -= amount;
 payable(msg.sender).transfer(amount);
 }

 // Check if any proposal is in voting period
 function isVotingActive() internal view returns (bool) {
 for (uint256 i = 0; i < totalProposals; i++) {
 if (block.timestamp < proposals[i].deadline && ! proposals[i].executed) {
 return true;
 }
 }
 return false;
 }

 // Check contract balance
 function getBalance() external view returns (uint256) {
 return address(this).balance;
 }
}
