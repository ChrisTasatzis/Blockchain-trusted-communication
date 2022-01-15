var TrustedGroup = artifacts.require("trustedGroup");

require("dotenv").config({path: "../.env"});

module.exports = async function(deployer) {
    let addr = await web3.eth.getAccounts();
    await deployer.deploy(TrustedGroup);
}
