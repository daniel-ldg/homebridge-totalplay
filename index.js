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
    }

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
            .on("set", (inputIdentifier, callback) => {
                this.setInput(callback, this.inputReferences[inputIdentifier]);
            })
            .on("get", this.getInput.bind(this));

        tvService.setCharacteristic(Characteristic.ConfiguredName, this.name);
        tvService.setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

        // Configure HomeKit TV Volume Control
        let tvSpeakerService = new Service.TelevisionSpeaker(this.name, 'TelevisionSpeaker');
        tvSpeakerService.setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
            .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.RELATIVE);

        tvSpeakerService.getCharacteristic(Characteristic.VolumeSelector)
            .on("set", this.setVolume.bind(this));

        tvSpeakerService.getCharacteristic(Characteristic.Mute)
            .on('get', this.getMute.bind(this))
            .on('set', this.setMute.bind(this));


        services.push(tvService, tvSpeakerService);
        return services;
    }

    async sendCommand(command) {
        await rp("http://" + this.ipAddress + "/RemoteControl/KeyHandling/sendKey?key=" + command)
            .catch(function (reason) {
                //ignore
            });
    }

    async sendCommands(commands) {
        for (const command of commands) {
            await this.sendCommand(command);
            await new Promise (resolve => {
                setTimeout(resolve, 200)
            })
        }
    }

    getActive(callback) {
        if (callback) {
            callback(null, true);
        }
    }

    setActive(state, callback) {
        this.sendCommand("on_off");
        callback(null, state);
    }

    setVolume(value, callback) {
        let command = "";
        switch (value) {
            case Characteristic.VolumeSelector.DECREMENT:
                command = "volume_down";
                break;
            case Characteristic.VolumeSelector.INCREMENT:
                command = "volume_up";
                break;
        }
        if (command !== "") {
            this.sendCommand(command);
        }
        callback(null, value);
    }

    getMute(callback) {
        callback(null, false)
    }

    setMute(state, callback) {
        this.sendCommand("mute");
        callback(null, state);
    }

    setInput() {

    }

    getInput() {

    }

}
