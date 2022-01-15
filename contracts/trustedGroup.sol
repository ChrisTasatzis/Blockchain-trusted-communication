// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract trustedGroup is Ownable {
    mapping(address => bool) private members;
    mapping(address => bool) private hasToken;

    event ReqToken(address _from, string _key);
    event SToken(address _to, string _encToken);
    event Comm(address indexed _from, string _encMessage);

    constructor() {
        members[msg.sender] = true;
        hasToken[msg.sender] = true;
    }

    function addMember(address member) public onlyOwner {
        require(members[member] != true, "Member already exists");
        members[member] = true;
    }

    function requestToken(string calldata publicKey) public {
        require(members[msg.sender] == true, "Not a member");
        emit ReqToken(msg.sender, publicKey);
    }

    function sendToken(string calldata EncryptedToken, address receiver)
        public
        onlyOwner
    {
        hasToken[receiver] = true;
        emit SToken(receiver, EncryptedToken);
    }

    function communicate(string calldata encMessage) public {
        require(members[msg.sender] == true, "Not a member");
        require(hasToken[msg.sender] == true, "Member doesn't have the Token");
        emit Comm(msg.sender, encMessage);
    }
}
