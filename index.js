// Created by daniel-ldg
//

const rp = require('request-promise');

let Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-totalplay", "totalplay", TotalplayAccessory);
};

TotalplayAccessory.prototype = {

    constructor: function (log, config) {
        this.log = log;
        this.name = config.name;
        this.ipAddress = config.ipAddress;
        this.inputs = config.inputs || [];
    },

    getServices: function () {
        let services = [];

        // Configure HomeKit TV Device Information
        let deviceInformation = new Service.AccessoryInformation();

        deviceInformation.setCharacteristic(Characteristic.Manufacturer, "Totalplay")
            .setCharacteristic(Characteristic.SerialNumber, "Unknown")
            .setCharacteristic(Characteristic.Model, "Unknown");

        // Configure HomeKit TV Accessory
        let tvService = new Service.Television(this.name, "Television");

        tvService.getCharacteristic(Characteristic.Active)
            .on("get", this.getActive.bind(this))
            .on("set", this.setActive.bind(this));

        tvService.getCharacteristic(Characteristic.ActiveIdentifier)
            .on('set', (inputIdentifier, callback) => {
                this.setInput(callback, this.inputReferences[inputIdentifier]);
            })
            .on('get', this.getInput.bind(this));

        tvService.setCharacteristic(Characteristic.ConfiguredName, this.name);
        tvService.setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.NOT_DISCOVERABLE);
    },

    sendCommand: async function(command) {
        rp("http://" + this.host + "/RemoteControl/KeyHandling/sendKey?key=" + command)
            .catch(function (reason) {
                //ignore
            });
    },

    sendCommands: async function(commands) {
        for (const command of commands) {
            this.sendCommand(command);
            await new Promise (resolve => {
                setTimeout(resolve, 200)
            })
        }
    },

    getActive: function (callback) {
        if (callback) {
            callback("can not get current Power state");
        }
    },

    setActive: function (state, callback) {
        this.sendCommand("on_off");
        callback(null, !state);
    },

    setInput: function () {

    },

    getInput: function () {

    }

};
