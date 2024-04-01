const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const constants = require('zigbee-herdsman-converters/lib/constants');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;
const ea = exposes.access;
const globalStore = require('zigbee-herdsman-converters/lib/store');
const OneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();


const tzLocal = {
	config_time: {
        key: ['display_time', 'view_disp'],
        convertSet: async (entity, key, rawValue, meta) => {
			const endpoint = meta.device.getEndpoint(1);
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
				display_time: ['genPowerCfg', {0xF004: {value, type: 0x20}}],
				view_disp: ['genPowerCfg', {0xF005: {value, type: 0x20}}],
            };
            await endpoint.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
	termostat_config: {
        key: ['high_temp', 'low_temp', 'enable_temp', 'invert_logic_temp'],
        convertSet: async (entity, key, rawValue, meta) => {
			const endpoint = meta.device.getEndpoint(1);
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                high_temp: ['msTemperatureMeasurement', {0x0221: {value, type: 0x29}}],
                low_temp: ['msTemperatureMeasurement', {0x0222: {value, type: 0x29}}],
				enable_temp: ['msTemperatureMeasurement', {0x0220: {value, type: 0x10}}],
				invert_logic_temp: ['msTemperatureMeasurement', {0x0225: {value, type: 0x10}}],
            };
            await endpoint.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
	hygrostat_config: {
        key: ['high_hum', 'low_hum', 'enable_hum', 'invert_logic_hum'],
        convertSet: async (entity, key, rawValue, meta) => {
			const endpoint = meta.device.getEndpoint(1);
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                high_hum: ['msRelativeHumidity', {0x0221: {value, type: 0x21}}],
                low_hum: ['msRelativeHumidity', {0x0222: {value, type: 0x21}}],
				enable_hum: ['msRelativeHumidity', {0x0220: {value, type: 0x10}}],
				invert_logic_hum: ['msRelativeHumidity', {0x0225: {value, type: 0x10}}],
            };
            await endpoint.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
};

const fzLocal = {
	config_time: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0xF004)) {
                result.display_time = msg.data[0xF004];
            }
			if (msg.data.hasOwnProperty(0xF005)) {
                result.view_disp = msg.data[0xF005];
            }
            return result;
        },
    },
	termostat_config: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0221)) {
                result.high_temp = msg.data[0x0221];
            }
			if (msg.data.hasOwnProperty(0x0222)) {
                result.low_temp = msg.data[0x0222];
            }
            if (msg.data.hasOwnProperty(0x0220)) {
                result.enable_temp = ['OFF', 'ON'][msg.data[0x0220]];
            }
			if (msg.data.hasOwnProperty(0x0225)) {
                result.invert_logic_temp = ['OFF', 'ON'][msg.data[0x0225]];
            }
            return result;
        },
    },
	hygrostat_config: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0221)) {
                result.high_hum = msg.data[0x0221];
            }
			if (msg.data.hasOwnProperty(0x0222)) {
                result.low_hum = msg.data[0x0222];
            }
            if (msg.data.hasOwnProperty(0x0220)) {
                result.enable_hum = ['OFF', 'ON'][msg.data[0x0220]];
            }
			if (msg.data.hasOwnProperty(0x0225)) {
                result.invert_logic_hum = ['OFF', 'ON'][msg.data[0x0225]];
            }
            return result;
        },
    },
};

const definition = {
        zigbeeModel: ['EFEKTA_eON29wz'],
        model: 'EFEKTA_eON29wz',
        vendor: 'Custom devices (DiY)',
        description: '[Mini weather station, barometer, forecast, charts, temperature, humidity, light](http://efektalab.com/eON290wz)',
        fromZigbee: [fz.temperature, fz.humidity, fz.pressure, fz.battery, fzLocal.termostat_config, fzLocal.hygrostat_config, fzLocal.config_time],
        toZigbee: [tz.factory_reset, tzLocal.termostat_config, tzLocal.hygrostat_config, tzLocal.config_time],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genTime', 'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement']);
			const payload1 = [{attribute: {ID: 0x0000, type: 0x29},
            minimumReportInterval: 0, maximumReportInterval: 1800, reportableChange: 0}];
            await endpoint.configureReporting('msTemperatureMeasurement', payload1);
			const payload2 = [{attribute: {ID: 0x0000, type: 0x21},
            minimumReportInterval: 0, maximumReportInterval: 1800, reportableChange: 0}];
			await endpoint.configureReporting('msRelativeHumidity', payload2);
			const payload3 = [{attribute: {ID: 0x0000, type: 0x29},
            minimumReportInterval: 0, maximumReportInterval: 1800, reportableChange: 0}];
			await endpoint.configureReporting('msPressureMeasurement', payload3);
			const payload4 = [{attribute: {ID: 0x0020, type: 0x20},
            minimumReportInterval: 0, maximumReportInterval: 7200, reportableChange: 0}];
			await endpoint.configureReporting('genPowerCfg', payload4);
			const payload5 = [{attribute: {ID: 0x0021, type: 0x20},
            minimumReportInterval: 0, maximumReportInterval: 7200, reportableChange: 0}];
			await endpoint.configureReporting('genPowerCfg', payload5);
			const payload6 = [{attribute: {ID: 0x003E, type: 0x1b},
            minimumReportInterval: 0, maximumReportInterval: 7200, reportableChange: 0}];
			await endpoint.configureReporting('genPowerCfg', payload6);
        },
        exposes: [e.temperature(), e.humidity(), e.pressure(),
		    e.battery(), e.battery_voltage(), e.battery_low(),
			exposes.enum('display_time', ea.STATE_SET, [0, 1]).withDescription('Display Time On/oFF(save battery)'),
			exposes.enum('view_disp', ea.STATE_SET, [0, 1]).withDescription('Display View'),
			exposes.binary('enable_temp', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Temperature Control'),
			exposes.binary('invert_logic_temp', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable invert logic Temperature Control'),
            exposes.numeric('high_temp', ea.STATE_SET).withUnit('C').withDescription('Setting High Temperature Border')
                .withValueMin(0).withValueMax(60),
            exposes.numeric('low_temp', ea.STATE_SET).withUnit('C').withDescription('Setting Low Temperature Border')
                .withValueMin(0).withValueMax(60),
		    exposes.binary('enable_hum', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Humidity Control'),
			exposes.binary('invert_logic_hum', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable invert logic Humidity Control'),
            exposes.numeric('high_hum', ea.STATE_SET).withUnit('C').withDescription('Setting High Humidity Border')
                .withValueMin(0).withValueMax(99),
            exposes.numeric('low_hum', ea.STATE_SET).withUnit('C').withDescription('Setting Low Humidity Border')
                .withValueMin(0).withValueMax(99)],
};

module.exports = definition;
