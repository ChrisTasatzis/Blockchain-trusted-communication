import React, { Component } from "react";
import TrustedGroup from "./contracts/trustedGroup.json";
import getWeb3 from "./getWeb3";
import RSAKey from "react-native-rsa";
import cryptojs from "crypto-js"
import "./App.css";

class App extends Component {
    state = {
        loaded: false,
        isOwner: false,
        memberAddress: "0x1234",
        publicKey: "",
        privateKey: "",
        groupToken: "",
        Message: "Write your message here",
        Messages: []
    };

    componentDidMount = async () => {
        try {
            // Get network provider and web3 instance.
            this.web3 = await getWeb3();

            // Use web3 to get the user's accounts.
            this.accounts = await this.web3.eth.getAccounts();

            // Get the contract instance.
            this.networkId = await this.web3.eth.net.getId();

            this.trustedGroupInstance = new this.web3.eth.Contract(
                TrustedGroup.abi,
                TrustedGroup.networks[this.networkId] && TrustedGroup.networks[this.networkId].address,
            );

            // Genarate rsa key pair for encryption.
            const bits = 1024;
            const exponent = '10001'; // must be a string. This is hex string. decimal = 65537
            var rsa = new RSAKey();
            rsa.generate(bits, exponent);
            var publicKey = rsa.getPublicString(); // return json encoded string
            var privateKey = rsa.getPrivateString(); // return json encoded string

            // See if user is the group owner
            var isOwner = false;
            let owner = await this.trustedGroupInstance.methods.owner().call({ from: this.accounts[0] });


            // Setup event listeners
            if (this.accounts[0] === owner) {
                this.listenToReqToken();
                isOwner = true;
                this.state.groupToken = "Secure Group Token";
            }

            this.listenToSendToken();
            this.listenToMessages();

            this.setState({ loaded: true, isOwner: isOwner, publicKey: publicKey, privateKey: privateKey },);
        } catch (error) {
            // Catch any errors for any of the above operations.
            alert(
                `Failed to load web3, accounts, or contract. Check console for details.`,
            );
            console.error(error);
        }
    };

    handleInputChange = (event) => {
        const target = event.target;
        const value = target.type === "checkbox" ? target.checked : target.value;
        const name = target.name;
        this.setState({
            [name]: value
        });
    }

    handleAddMember = async () => {
        try {
            await this.trustedGroupInstance.methods.addMember(this.state.memberAddress).send({ from: this.accounts[0] });
            alert("Member " + this.state.memberAddress + " added.");
        }
        catch (er) {
            alert(er);
        }
    }

    handleReqToken = async () => {
        try {
            await this.trustedGroupInstance.methods.requestToken(this.state.publicKey).send({ from: this.accounts[0] });
            alert("Token requested successfully!")
        }
        catch (er) {
            alert(er);
        }
    }

    listenToSendToken = () => {
        this.trustedGroupInstance.events.SToken({fromBlock:'latest', _to: this.accounts[0] }).on("data", this.updateGroupToken);
    }

    listenToReqToken = () => {
        this.trustedGroupInstance.events.ReqToken({fromBlock:'latest'}).on("data", this.sendGroupToken);
    }

    listenToMessages = () => {
        this.trustedGroupInstance.events.Comm({fromBlock:'latest'}).on("data", this.appendMessage);
    }

    sendGroupToken = async (ev) => {
        try {
            // Retrieve receiver and their public key from the event
            var receiver = ev.returnValues._from;
            var publickey = ev.returnValues._key;

            // Setup rsa with the public key 
            var rsa = new RSAKey();
            rsa.setPublicString(publickey);

            // Encrypt the token (the token will have to be stored locally)
            var originText = this.state.groupToken;
            var encrypted = rsa.encrypt(originText);

            // Send the key to the receiver (only the owner can send this transaction)
            await this.trustedGroupInstance.methods.sendToken(encrypted, receiver).send({ from: this.accounts[0] });
        }
        catch (e) {
            console.log(e);
        }
    }

    updateGroupToken = async (ev) => {
        try {
            // Retrieve ecrypted token from event
            var receiver = ev.returnValues._to;
            var encToken = ev.returnValues._encToken;

            if (receiver !== this.accounts[0]) return;

            // Setup rsa with the private key
            var rsa = new RSAKey();
            rsa.setPrivateString(this.state.privateKey);

            // Decrypt token
            var decrypted = rsa.decrypt(encToken);

            // Update state
            this.setState({ groupToken: decrypted });
        }
        catch (e) {
            console.log(e);
        }

    }

    sendMessage = async () => {

        try {
            // Check if we have the token
            if (this.state.groupToken === "") {
                alert("Please request the group token")
                return;
            }

            // Encrypt the message with the token 
            var encryptedMessage = cryptojs.AES.encrypt(this.state.Message, this.state.groupToken).toString();

            // Send the transaction
            await this.trustedGroupInstance.methods.communicate(encryptedMessage).send({ from: this.accounts[0] })
        }
        catch (e) {
            console.log(e);
        }
    }

    appendMessage = (ev) => {        
        // Check if user does not have the group token
        if (this.state.groupToken === '') return;

        // Decrypt the message with the group token
        var messageValue = cryptojs.AES.decrypt(ev.returnValues._encMessage, this.state.groupToken).toString(cryptojs.enc.Utf8)
        var messageKey = ev.id;

        // Check if the message has already been appended
        if(this.state.Messages.findIndex(item => item.key === messageKey) >= 0)
            return;

        // Add the message to the state
        this.state.Messages.push({key: messageKey, value: messageValue})
        this.setState({ Messages: this.state.Messages });
    }


    render() {
        if (!this.state.loaded) {
            return <div>Loading Web3, accounts, and contract...</div>;
        }

        const addMember = () => {
            if (this.state.isOwner) {
                return <div>
                    <h2>Add member to group</h2>
                    Address to allow: <input type="text" name="memberAddress" value={this.state.memberAddress} onChange={this.handleInputChange} />
                    <button type="button" onClick={this.handleAddMember}> Add Member</button>
                </div>
            }
        }

        const requestGroupToken = () => {
            if (!this.state.isOwner) {
                return <div>
                    <h2>Request Group Token </h2>
                    <button type="button" onClick={this.handleReqToken}>Request</button><br />
                    <input type="hidden" name="groupToken" value={this.state.groupToken} onChange={this.handleInputChange}></input>
                </div>
            }
        }

        const List = ({ items }) => (
            <ul>
              {
                items.map((item) => <li key={item.key}>{item.value}</li>)
              }
            </ul>
          );

        return (
            <div className="App">
                <h1>Trusted Group Communication</h1>

                {addMember()}

                {requestGroupToken()}

                <h2>Send Message</h2>
                <textarea name="Message" value={this.state.Message} onChange={this.handleInputChange}></textarea><br />
                <button type="button" onClick={this.sendMessage}>Send</button>

                <h2>Messages</h2>
                <List items={this.state.Messages} />

            </div>
        );
    }
}

export default App;
