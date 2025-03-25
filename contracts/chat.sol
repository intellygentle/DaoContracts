// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IFundingDAO {
    function proposals(uint256 proposalId) external view returns (
        string memory description,
        address nominee,
        uint256 deadline,
        uint256 yesVotes,
        uint256 noVotes,
        bool executed,
        address proposer
    );
    function totalProposals() external view returns (uint256);
}

contract MessageBoard {
    struct Message {
        address sender;
        string content;
        uint256 timestamp;
    }

    Message[] public messages;
    address public fundingDAO;

    constructor(address _fundingDAO) {
        fundingDAO = _fundingDAO;
    }

    // Check if an address has created a proposal
    function hasCreatedProposal(address user) internal view returns (bool) {
        IFundingDAO dao = IFundingDAO(fundingDAO);
        uint256 total = dao.totalProposals();
        for (uint256 i = 0; i < total; i++) {
            (, , , , , , address proposer) = dao.proposals(i);
            if (proposer == user) {
                return true;
            }
        }
        return false;
    }

    // Post a message to the board (only proposal creators)
    function postMessage(string calldata content) external {
        require(hasCreatedProposal(msg.sender), "Only proposal creators can post");
        messages.push(Message({
            sender: msg.sender,
            content: content,
            timestamp: block.timestamp
        }));
    }

    // Get all messages
    function getMessages() external view returns (Message[] memory) {
        return messages;
    }

    // Get message count
    function getMessageCount() external view returns (uint256) {
        return messages.length;
    }
}