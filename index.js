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
        this.deviceInformation = new Service.AccessoryInformation();

        this.deviceInformation.setCharacteristic(Characteristic.Manufacturer, "Totalplay")
            .setCharacteristic(Characteristic.SerialNumber, "Unknown")
            .setCharacteristic(Characteristic.Model, "Unknown");

        // Configure HomeKit TV Accessory
        this.tvService = new Service.Television(this.name, "Television");

        this.tvService.getCharacteristic(Characteristic.Active)
            .on("get", this.getActive.bind(this))
            .on("set", this.setActive.bind(this));

        this.tvService.getCharacteristic(Characteristic.ActiveIdentifier)
            .on("get", this.getInput.bind(this))
            .on("set", this.setInput.bind(this));

        this.tvService.setCharacteristic(Characteristic.ConfiguredName, this.name);
        this.tvService.setCharacteristic(Characteristic.SleepDiscoveryMode, Characteristic.SleepDiscoveryMode.NOT_DISCOVERABLE);

        // Configure HomeKit TV Volume Control
        this.tvSpeakerService = new Service.TelevisionSpeaker(this.name, 'TelevisionSpeaker');
        this.tvSpeakerService.setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
            .setCharacteristic(Characteristic.VolumeControlType, Characteristic.VolumeControlType.RELATIVE);

        this.tvSpeakerService.getCharacteristic(Characteristic.VolumeSelector)
            .on("set", this.setVolume.bind(this));

        this.tvSpeakerService.getCharacteristic(Characteristic.Mute)
            .on('get', this.getMute.bind(this))
            .on('set', this.setMute.bind(this));

        this.tvService.addLinkedService(this.tvSpeakerService);

        // Configure HomeKit TV Inputs
        this.inputs.forEach((input, i) => {
            if (input.type === "channel") {
                this.log("setting up input: " + input.name);

                let inputSource = new Service.InputSource(input.name, "input" + i);
                inputSource.setCharacteristic(Characteristic.ConfiguredName, input.name)
                    .setCharacteristic(Characteristic.InputSourceType, Characteristic.InputSourceType.APPLICATION)
                    .setCharacteristic(Characteristic.IsConfigured, Characteristic.IsConfigured.CONFIGURED)
                    .setCharacteristic(Characteristic.CurrentVisibilityState, Characteristic.CurrentVisibilityState.SHOWN)
                    .setCharacteristic(Characteristic.Identifier, input.channelNum);

                this.tvService.addLinkedService(inputSource);
                services.push(inputSource);
            }
        });

        services.push(this.deviceInformation, this.tvService, this.tvSpeakerService);
        return services;
    }

    async sendCommand(command) {
        this.log("Sending command " + command);
        await rp("http://" + this.ipAddress + "/RemoteControl/KeyHandling/sendKey?key=" + command)
            .catch(reason => {
                if (reason.message === "Error: Parse Error") {
                    // ignore
                } else {
                    this.log(reason);
                }
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

    setInput(inputIdentifier, callback) {
        let channel = "000000000" + inputIdentifier;
        channel = channel.substr(channel.length - 3);
        this.sendCommands([channel.charAt(0), channel.charAt(1), channel.charAt(2)]);
        callback(null, inputIdentifier);
    }

    getInput(callback) {
        this.tvService.getCharacteristic(Characteristic.ActiveIdentifier).updateValue(0);
        callback();
    }

}
