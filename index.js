// Created by daniel-ldg
//

const rp = require('request-promise');

let Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-totalplay", "totalplay", TotalplayAccessory);
};

class TotalplayAccessory {

    constructor(log, config) {
        this.log = log;
        this.name = config.name;
        this.ipAddress = config.ipAddress;
        this.inputs = config.inputs || [];
    };

    getServices() {
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



        services.push(tvService);
        return services;
    };

    async sendCommand(command) {
        await rp("http://" + this.ipAddress + "/RemoteControl/KeyHandling/sendKey?key=" + command)
            .catch(function (reason) {
                //ignore
            });
    };

    async sendCommands(commands) {
        for (const command of commands) {
            await this.sendCommand(command);
            await new Promise (resolve => {
                setTimeout(resolve, 200)
            })
        }
    };

    getActive(callback) {
        if (callback) {
            callback("can not get current Power state");
        }
    };

    setActive(state, callback) {
        this.sendCommand("on_off");
        callback(null, !state);
    };

    setInput() {

    };

    getInput() {

    };

}
