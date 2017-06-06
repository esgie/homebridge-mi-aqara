require('./BaseParser');
const inherits = require('util').inherits;

var Accessory, PlatformAccessory, Service, Characteristic, UUIDGen;

ButtonParser = function(platform) {
	this.init(platform);
	
	Accessory = platform.Accessory;
	PlatformAccessory = platform.PlatformAccessory;
	Service = platform.Service;
	Characteristic = platform.Characteristic;
	UUIDGen = platform.UUIDGen;
}
inherits(ButtonParser, BaseParser);

ButtonParser.prototype.parse = function(json, rinfo) {
	this.platform.log.debug(JSON.stringify(json).trim());
	
	var data = JSON.parse(json['data']);
	var clickWay = data['status'];
	var voltage = data['voltage'] / 1.0;
	var lowBattery = this.getLowBatteryByVoltage(voltage);
	var batteryLevel = this.getBatteryLevelByVoltage(voltage);

	var equipmentSid = json['sid'];
	this.setButtonAccessory(equipmentSid, clickWay, lowBattery, batteryLevel);
}

ButtonParser.prototype.getUuidsByEquipmentSid = function(equipmentSid) {
	return [UUIDGen.generate('Button' + equipmentSid)];
}

ButtonParser.prototype.setButtonAccessory = function(equipmentSid, clickWay, lowBattery, batteryLevel) {
	var uuid = UUIDGen.generate('Button' + equipmentSid);
	var accessory = this.platform.getAccessoryByUuid(uuid);
	if(null == accessory) {
		var accessoryName = equipmentSid.substring(equipmentSid.length - 4);
		accessory = new PlatformAccessory(accessoryName, uuid, Accessory.Categories.PROGRAMMABLE_SWITCH);
		accessory.reachable = true;

		accessory.getService(Service.AccessoryInformation)
			.setCharacteristic(Characteristic.Manufacturer, "Aqara")
			.setCharacteristic(Characteristic.Model, "Button")
			.setCharacteristic(Characteristic.SerialNumber, equipmentSid);

		accessory.addService(Service.StatelessProgrammableSwitch, accessoryName);
		accessory.addService(Service.BatteryService, accessoryName);
		this.platform.api.registerPlatformAccessories("homebridge-mi-aqara", "MiAqaraPlatform", [accessory]);
		accessory.on('identify', function(paired, callback) {
			that.log(accessory.displayName, "Identify!!!");
			callback();
		});
		
		this.platform.accessories.push(accessory);
		this.platform.log.debug("create new accessories - UUID: " + uuid + ", type: Button, equipmentSid: " + equipmentSid);
	}
	var buttonService = accessory.getService(Service.StatelessProgrammableSwitch);
	var buttonCharacteristic = buttonService.getCharacteristic(Characteristic.ProgrammableSwitchEvent);
	if(clickWay === 'click') {
		buttonCharacteristic.updateValue(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
	} else if(clickWay === 'double_click') {
		buttonCharacteristic.updateValue(Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
	} else if(clickWay === 'long_click_release') {
		/* 'long_click_press' */
		buttonCharacteristic.updateValue(Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
	} else {
	}
	
	if(!isNaN(lowBattery) && !isNaN(batteryLevel)) {
		var batService = accessory.getService(Service.BatteryService);
		var lowBatCharacteristic = batService.getCharacteristic(Characteristic.StatusLowBattery);
		var batLevelCharacteristic = batService.getCharacteristic(Characteristic.BatteryLevel);
		var chargingStateCharacteristic = batService.getCharacteristic(Characteristic.ChargingState);
		lowBatCharacteristic.updateValue(lowBattery);
		batLevelCharacteristic.updateValue(batteryLevel);
		chargingStateCharacteristic.updateValue(false);
	}
}
