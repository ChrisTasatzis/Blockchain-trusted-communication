# Blockchain-trusted-communication
This a demo web application that lets users communicate securely through the blockain. 

# Prequisites
- [Metamask](https://metamask.io)
- [Truffles Suite](https://trufflesuite.com)
- [Ganache](https://trufflesuite.com/ganache/)
- [Node.js](https://nodejs.org/en/)

# Usage
- Clone repository
- Open Ganache (Quickstart)
- Add ganache to metamask networks (Chain id: 1337)
- Add a .env file in the directory that contains a key called MNEMONIC and value the Mnemonic shown on ganache
- Migrate the smart contract to Ganache using the following commands
```
- npm install
- truffle migrate --network ganache_local
```
- Import two accounts from ganache to metamask (The first one is always the owner) 
- Start the web app 
```
- cd Client
- npm install
- npm run start
```
