const TrustedGroup = artifacts.require("trustedGroup.sol");
require("dotenv").config({ path: "../.env" });

const chai = require("./setupchai.js");
const BN = web3.utils.BN;
const expect = chai.expect;
const truffleAssert = require('truffle-assertions');
const crypto = require('crypto');

contract("Trusted Group Test", async (accounts) => {

    const [deployerAccount, anotherAccount] = accounts;

    beforeEach(async () => {
        this.trustedGroup = await TrustedGroup.new();
    });

    it("owner should be in the group and able to communicate", async () => {
        let instance = this.trustedGroup;
        let message = '25';
        let GroupToken = crypto.randomBytes(32);

        // Encrypt the message with the group token
        let encMessage = encryptSymm(message, GroupToken);

        // Share the encrypted message through the blockchain
        let tx = await expect(instance.communicate(encMessage, {from: deployerAccount})).to.eventually.be.fulfilled;
        truffleAssert.eventEmitted(tx, 'Comm', (ev) => {
            return ev._from === deployerAccount && ev._encMessage == encMessage;
        });

        // Decrypt the message received 
        let decMessage = decryptSymm(encMessage, GroupToken);

        // Check outcome
        expect(decMessage).equals(message);
    })

    it("Others not in the group should not be able to communicate", async () => {
        let instance = this.trustedGroup;

        let message = '25';
        let GroupToken = crypto.randomBytes(32);

        // Encrypt the message with the group token
        let encMessage = encryptSymm(message, GroupToken);

        // Share the encrypted message through the blockchain
        await expect(instance.communicate(encMessage, {from: anotherAccount})).to.eventually.be.rejected;
    })

    it("Owner should be able to add members", async () => {
        let instance = this.trustedGroup;

        await expect(instance.addMember(anotherAccount, {from: deployerAccount})).to.eventually.be.fulfilled;
    })

    it("members should not be able to add members", async () => {
        let instance = this.trustedGroup;

        // AnotherAccount becomes a member
        await expect(instance.addMember(anotherAccount, {from: deployerAccount})).to.eventually.be.fulfilled;
        
        // AnotherAccount tries to add a member
        await expect(instance.addMember(accounts[2], {from: anotherAccount})).to.eventually.be.rejected;
    })

    it("members should be able to request group token", async () => {
        let instance = this.trustedGroup;

        // AnotherAccount becomes a member
        await expect(instance.addMember(anotherAccount, {from: deployerAccount})).to.eventually.be.fulfilled;
        
        // AnotherAccount request the group Token
        let tx = await expect(instance.requestToken(anotherAccount, {from: anotherAccount})).to.eventually.be.fulfilled;
        truffleAssert.eventEmitted(tx, 'ReqToken', (ev) => {
            return ev._from === anotherAccount;
        });
    })

    it("non members should not be able to request group token", async () => {
        let instance = this.trustedGroup;

        // AnotherAccount request the group Token without being a member
        await expect(instance.requestToken(anotherAccount, {from: anotherAccount})).to.eventually.be.rejected;
    })

    it("owner should be able to send the encrypted group token to accounts that have requested it", async () => {
        let instance = this.trustedGroup;

        let Token = "25";

        const [publicReqKey, privateReqKey] = generateKeys();

        // Make account a member
        await expect(instance.addMember(anotherAccount, { from: deployerAccount })).to.eventually.be.fulfilled;
        
        // Other account requests group token
        let tx = await expect(instance.requestToken(publicReqKey, {from: anotherAccount})).to.eventually.be.fulfilled;
        truffleAssert.eventEmitted(tx, 'ReqToken', (ev) => {
            return ev._from === publicReqKey;
        });

        // Encrypt token with public key 
        let encToken = crypto.publicEncrypt(publicReqKey, Buffer.from(Token, 'utf8'))
        .toString('base64');


        // Send encrypted Token from the owner
        let tx2 = await expect(instance.sendToken(encToken, anotherAccount, {from:deployerAccount})).to.eventually.be.fulfilled;
        truffleAssert.eventEmitted(tx2, 'SToken', (ev) => {
            return ev._to === anotherAccount && ev._encToken == encToken;
        });

        // Decrypt token with private key
        let DecToken = crypto.privateDecrypt(privateReqKey, Buffer.from(encToken, 'base64')).toString('utf-8');

        expect(DecToken).to.equal(Token);
    })
});


function generateKeys() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    return [publicKey, privateKey];
}

function encryptSymm(message = '', key = ''){
    const cipher = crypto.createCipheriv('aes-256-ecb', key, "");
    return cipher.update(message, "utf-8", "hex") + cipher.final("hex");
}
function decryptSymm(message = '', key = ''){
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, "");
    return decipher.update(message, "hex", "utf-8") + decipher.final("utf8");
}