  

// Boiler plate from the Scratch Team
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');
const uid = require('../../util/uid');
const SR = require('../../io/serial');
const Base64Util = require('../../util/base64-util');
const MathUtil = require('../../util/math-util');
const RateLimiter = require('../../util/rateLimiter.js');
const log = require('../../util/log');


// The following are constants used within the extension

const sensorTypes = {
    SERVO_CONTROL: 0,
    HOME_CONTROL: 1,
    PORT_CONTROL: 2,
    PORT_OUT_CONTROL: 3,
    BUZZ_CONTROL: 4,
    SERVO_SPEED: 5,
    SET_SERVO_OFFSET_ZERO: 6,
    SET_SERVO_HOME_POS: 7,
    AIDESK_CONTROL: 8,
    REMOTE_DEVICE: 9,
    CONNECT_DEVICE: 10,
};
     
/**
 * A maximum number of BT message sends per second, to be enforced by the rate limiter.
 * @type {number}
 */
const BTSendRateMax = 10;
const SRSendInterval  = 100;



const blockIconURI = 'data:image/png;base64,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';
// flag to indicate if the user connected to a board

// common

const Message = {
    name: {      
        'en': 'AIBOT',
        'ko': 'AIBOT'
    },
    angle_control_1234: {
        'en': 'modules 1[ANG1], 2[ANG2], 3[ANG3], 4[ANG4] degrees',
        'ko': '모듈 1[ANG1], 2[ANG2], 3[ANG3], 4[ANG4] 각도로 제어'    
    },
    remote_angle_control_1234: {
        'en': 'remote modules 1[ANG1], 2[ANG2], 3[ANG3], 4[ANG4] degrees',
        'ko': '원격모듈 1[ANG1], 2[ANG2], 3[ANG3], 4[ANG4] 각도로 제어'    
    }      
}

class aibotSR{
    constructor (runtime, extensionId) {
    //the_locale = this._setLocale();
        /**
         * The Scratch 3.0 runtime used to trigger the green flag button.
         * @type {Runtime}
         * @private
         */
         // the pin assigned to the sonar trigger
         // initially set to -1, an illegal value
         this.sonar_report_pin = -1;

        
         // general outgoing websocket message holder
         this.msg = null;
         

         this.ble_str = null;

         this._runtime = runtime;
         
         this._runtime.on('PROJECT_STOP_ALL', this.stopAll.bind(this));
         
         this._extensionId = extensionId;
 
         this.connected = false;
         this._serial = null;
         this._runtime.registerPeripheralExtension(extensionId, this);

         this._timeoutID = null;
        
         this.pin_modes = new Array(34).fill(-1);
    
         this._rateLimiter = new RateLimiter(BTSendRateMax);
 
         this.reset = this.reset.bind(this);
         this._onConnect = this._onConnect.bind(this);
         this._onMessage = this._onMessage.bind(this);

         this.rcvCount = 0;
         
         this.array = {
            SERVO_CONTROL: 0,
            HOME_CONTROL: 1,
            PORT_CONTROL: 2,
            PORT_OUT_CONTROL: 3,
            BUZZ_CONTROL: 4,
            SERVO_SPEED: 5,
            SET_SERVO_OFFSET_ZERO: 6,
            SET_SERVO_HOME_POS: 7,
            AIDESK_CONTROL: 8,
            REMOTE_DEVICE: 9,
            CONNECT_DEVICE: 10,
        };

        this.sensorData = {
            SENSOR: {
                A0: 0,
                A1: 0,
                A2: 0,
                A3: 0,
                A4: 0,
                A5: 0,
                A6: 0,
                A7: 0,
                A8: 0,
                A9 : 0,
                A10: 0,
                A11: 0,
                A12: 0,
                A13: 0,
                A14: 0,
                A15: 0,
                A16: 0,
                A17: 0,
                A18: 0,
                A19: 0,
            },
            AIDESK: {
                AD0: 0,
                AD1: 0,
                AD2: 0,
                AD3: 0,
                AD4: 0,
                AD5: 0,
            },
        };

        this.delayTime = 1000;
        this.timeouts = [];
    }
    stopAll () {



    }
    
    reset () {
        this.pin_modes.fill(-1);
    }
    _onConnect () {
        console.log('connected AIBot....');
        this.connected = true; 
        
        this._timeoutID = window.setInterval(
            () => this._serial.handleDisconnectError('SerialDataStoppedError'),            
            3000000
        );
                  
    }
    scan () {
        console.log('scanning....');
        if (this._serial) {
            this._serial.disconnect();
        }
        this._serial = new SR(this._runtime, this._extensionId, {
            majorDeviceClass: 0,
            minorDeviceClass: 0
        }, this._onConnect, this.reset, this._onMessage);
    }
    /**
     * Called by the runtime when user wants to connect to a certain LECOBOARD peripheral.
     * @param {number} id - the id of the peripheral to connect to.
     */

    connect (id) {
        if (this.connected) {
            // ignore additional connection attempts
            //console.log('connect ignored....');
            return;
        }
        if (this._serial) {
            this._serial.connectPeripheral(id);
            //console.log('connected....');
        }
    }    
    disconnect () {
        window.clearInterval(this._timeoutID);
        console.log('disconnect....');
        if (this._serial) {
            this._serial.disconnect();
        }
        this.connected = false;
        this.reset();
    }   
    /**
     * Send a message to the peripheral BT socket.
     * @param {Uint8Array} message - the message to send.
     * @param {boolean} [useLimiter=true] - if true, use the rate limiter
     * @return {Promise} - a promise result of the send operation.
     */
    isConnected () {        
        let _connected = false;
        if (this._serial) {
            _connected = this._serial.isConnected();
        }
        return _connected;
    }
    send (message, useLimiter = true) {
        //console.log('send message....');
        if (!this.isConnected()) return Promise.resolve();

        

        if (useLimiter) {
            if (!this._rateLimiter.okayToSend()) return Promise.resolve();
        }

        return this._serial.sendMessage({
            message: Base64Util.uint8ArrayToBase64(message),
            encoding: 'base64'
        });
    }
    generateCommand (byteCommands) {
        let command = [];
        // Bytecodes (Bytes 7 - n)
        command = command.concat(byteCommands);
        //this.sensorIdx = 0;
        return command;
    }
    
    getDataByBuffer (buffer) {
        const datas = [];
        let lastIndex = 0;
        
        buffer.forEach((value,idx) => {
            if (value == 73 && buffer[idx+1] == 1) {      
                if( buffer.length > (idx+28) )          
                datas.push(buffer.subarray(idx, idx+28));
                idx = idx + 28;
            }
            else if (value == 88 && buffer[idx+1] == 1) {     
                if( buffer.length > (idx+14) )             
                datas.push(buffer.subarray(idx, idx+14)); 
                idx = idx + 14;
            }
        });
        return datas;
    }

    _onMessage (params) { 
        //console.log('onMessage....');         
        window.clearInterval(this._timeoutID);
        this._timeoutID = window.setInterval(
            () => this._serial.handleDisconnectError('SerialDataStoppedError'),
            3000000
        );
        if(params==null){
            return;
        }         
        
        const message = params.message;
        const dataOrigin = Base64Util.base64ToUint8Array(message);
        const datas = this.getDataByBuffer(dataOrigin);
        var sd = this.sensorData.SENSOR;
        var ad = this.sensorData.AIDESK;
        var val = 0;
        var data = datas[0];
        if(data != null)             
        if(data[0]==73 && data[1]==1){  //'I'
            for (var i = 0; i < 4; i++) {
                sd[i] = data[2+i];	
            }
            for (var i = 0; i < 4; i++) {
                val = (((data[6+i*2] & 0xFF) << 8) | (data[6+i*2+1] & 0xFF));
                sd[4+i] = val;  	
            }
            //console.log(data);
        }
        if(data[14]==73 && data[15]==2){  //'I'
            for (var i = 0; i < 4; i++) {
                sd[8+i] = data[14+2+i];	
            }                
            for (var i = 0; i < 4; i++) {
                val = (((data[14+6+i*2] & 0xFF) << 8) | (data[14+6+i*2+1] & 0xFF));
                sd[8+4+i] = val;  	
            }
            //console.log(data);
            this.rcvCount++;
            if(this.rcvCount > 2){
                this.rcvCount==0;
                this.connect_device(1);
            }
        }
        
        var s = 0;
        if(data != null)  
        if(data[s]==88 && data[s+1]==1){//'X'
            for (var i = 0; i < 6; i++) {
                val = (((data[s+2+i*2] & 0xFF) << 8) | (data[s+2+i*2+1] & 0xFF));
                if(val>32767)val=val-65536;
                if(val>-2000 && val<2000)ad[i] = val;  	
                
            }
        }	

        return;
    }
    
    port_digital_out(remote,port,set){
        const cmd = this.generateCommand(                
            [68,remote,port,set,255,255,255,255,255,255,255,255,255,255]
            );        
        this.send(cmd);
        //console.log('port digital out...');
        //console.log(cmd);
    }
    port_setting(remote,port,set){
        const cmd = this.generateCommand(                
            [80,remote,port,set,255,255,255,255,255,255,255,255,255,255]
            );        
        this.send(cmd);
        //console.log('port setting...');
        //console.log(cmd);
    }
    buzzer_melody(remote,melody){
        const cmd = this.generateCommand(                
            [77,remote,melody,0,0,255,255,255,255,255,255,255,255,255]
            );        
        this.send(cmd);
        //console.log('buzzer melody...');
        //console.log(cmd);
    }
    control_speed(remote,speed){
        const cmd = this.generateCommand(                
            [83,remote,speed,0,0,255,255,255,255,255,255,255,255,255]
            );        
        this.send(cmd);
        //console.log('control speed...');
        //console.log(cmd);
    }
    control_go_home(remote){
        const cmd = this.generateCommand(                
            [72,remote,0,0,0,255,255,255,255,255,255,255,255,255]
            );        
        this.send(cmd);        
    }
    factory_reset(remote){
        const cmd = this.generateCommand(                
            [67,remote,0,0,0,255,255,255,255,255,255,255,255,255]
            );        
        this.send(cmd);        
    }
    set_home_position(remote,sv1,sv2,sv3,sv4,sv5,sv6){
        const cmd = this.generateCommand(                
            [
                67,remote,
                sv1>>8, sv1&0xff,
                sv2>>8, sv2&0xff,
                sv3>>8, sv3&0xff,
                sv4>>8, sv4&0xff,
                sv5>>8, sv5&0xff,
                sv6>>8, sv6&0xff               
            ]
            );        
        this.send(cmd);
        //console.log('control angle...');
        console.log(cmd);
    }
    control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6){
        const cmd = this.generateCommand(                
            [
                66,remote,
                sv1>>8, sv1&0xff,
                sv2>>8, sv2&0xff,
                sv3>>8, sv3&0xff,
                sv4>>8, sv4&0xff,
                sv5>>8, sv5&0xff,
                sv6>>8, sv6&0xff               
            ]
            );        
        this.send(cmd);
        //console.log('control angle...');
        //console.log(cmd);
    }
    remote_device_set(remote,v1,v2,v3){
        const cmd = this.generateCommand(                
            [90,remote,v1,v2,v3,255,255,255,255,255,255,255,255,255]
            );        
        this.send(cmd);        
    }
    aidesk_func(remote,func,v1,v2,v3,v4){
        if(v1<0)v1=65536+v1;
		if(v2<0)v2=65536+v2;
		if(v3<0)v3=65536+v3;
		if(v4<0)v4=65536+v4;
        const cmd = this.generateCommand(                
            [
                75,remote,func, 0,
                v1>>8, v1&0xff,
                v2>>8, v2&0xff,
                v3>>8, v3&0xff,
                v4>>8, v4&0xff,
                255, 255               
            ]
            );        
        this.send(cmd);
        //console.log('control angle...');
        //console.log(cmd);
    }
    connect_device(remote){
        const cmd = this.generateCommand(                
            [65,remote,0,0,0,0,0,0,0,0,0,0,0,0]
            );        
        this.send(cmd);   
        //console.log(cmd);     
    }
    removeTimeout(id) {
        clearTimeout(id);
        var timeouts = this.timeouts;
        var index = timeouts.indexOf(id);
        if (index >= 0) {
            timeouts.splice(index, 1);
        }
    }

}

class Scratch3aibotSR {
    /**
     * The ID of the extension.
     * @return {string} the id
     */
     static get EXTENSION_ID () {
        return 'aibot';
    }

    /**
     * Creates a new instance of the lecoboard extension.
     * @param  {object} runtime VM runtime
     * @constructor
     */
    constructor (runtime) {
        /**
         * The Scratch 3.0 runtime.  
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.locale = this._setLocale();

        // Create a new aibotSR peripheral instance
        this._peripheral = new aibotSR(this.runtime, Scratch3aibotSR.EXTENSION_ID);

    }

    

    getInfo() {
        //the_locale = this._setLocale();
        //this.connect();

        return {
            id: Scratch3aibotSR.EXTENSION_ID,
            color1: '#0C5986',
            color2: '#34B0F7',
            name: 'AIBOT',
            showStatusButton: true,
            blockIconURI: blockIconURI,
            
            blocks: [ 
                {
                    opcode: 'analog_read',
                    blockType: BlockType.REPORTER,                    
                    text: formatMessage({
                        id: 'aibot.analoginput',
                        default: 'read [PORT] analog input',
                        description: 'Read Analog Input Value'
                    }),
                    arguments: {
                        PORT: {
                            type: ArgumentType.STRING,
                            defaultValue: '0',
                            menu: 'target_port'
                        },
                    }
                },              
                {
                    opcode: 'digital_read',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'aibot.digitalinput',
                        default: 'read [PORT] digital input',
                        description: 'Read Digital Input Value'
                    }),
                    arguments: {
                        PORT: {
                            type: ArgumentType.STRING,
                            defaultValue: '0',
                            menu: 'target_port'
                        },
                    }
                },
                {
                    opcode: 'port_setting',
                    blockType: BlockType.COMMAND,                    
                    text: formatMessage({
                        id: 'aibot.portsetting',
                        default: 'set port[PORT] mode to [SET]',
                        description: 'Set Port Mode'
                    }),
                    arguments: {
                        PORT: {
                            type: ArgumentType.STRING,
                            defaultValue: '0',
                            menu: 'target_port'
                        },
                        SET: {
                            type: ArgumentType.STRING,
                            defaultValue: '0',
                            menu: 'port_inout'
                        },
                    }
                },  
                {
                    opcode: 'port_digital_out',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.setdigitalport',
                        default: 'set port[PORT] to [SET]',
                        description: 'Set Digital Port'
                    }),
                    arguments: {
                        PORT: {
                            type: ArgumentType.STRING,
                            defaultValue: '0',
                            menu: 'target_port'
                        },
                        SET: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: 'on_off'
                        },
                    }
                },     
                {
                    opcode: 'buzzer_melody',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.playmelody',
                        default: 'play buzzer melody [MEL]',
                        description: 'Play Buzzer Melody'
                    }),
                    arguments: {
                        MEL: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: 'melody_no'
                        },
                    }
                },      
                {
                    opcode: 'control_speed',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.controlspeed',
                        default: 'set module speed to [SPD]',
                        description: 'Set Control Speed of Module'
                    }),
                    arguments: {
                        SPD: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: 'speed_no'
                        },
                    }
                },   
                {
                    opcode: 'control_angle',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.servoangle',
                        default: 'module [SV] to [ANG] degrees',
                        description: 'Control Angle'
                    }),
                    arguments: {
                        SV: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: 'servo_no'
                        },
                        ANG: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },   
                {
                    opcode: 'control_angle',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.servoangle',
                        default: 'module [SV] to [ANG] degrees',
                        description: 'Control Angle'
                    }),
                    arguments: {
                        SV: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1',
                        },
                        ANG: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },         
                {
                    opcode: 'control_angle_123',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.servoangle123',
                        default: 'modules 1[ANG1], 2[ANG2], 3[ANG3] degrees',
                        description: 'Control Angle of Module 1,2,3'
                    }),
                    arguments: {                        
                        ANG1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG3: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },  
                {
                    opcode: 'control_angle_1234',
                    blockType: BlockType.COMMAND,
                    text: Message.angle_control_1234[this.locale],
                    arguments: {                        
                        ANG1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG3: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG4: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },  
                {
                    opcode: 'control_angle_56',
                    blockType: BlockType.COMMAND,                    
                    text: formatMessage({
                        id: 'aibot.servoangle56',
                        default: 'modules 5[ANG5], 6[ANG6] degrees',
                        description: 'Control Angle of Module5,6'
                    }),
                    arguments: {  
                        ANG5: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG6: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },  
                {
                    opcode: 'control_angle_123456',
                    blockType: BlockType.COMMAND,                    
                    text: formatMessage({
                        id: 'aibot.servoangle123456',
                        default: 'modules 1[ANG1], 2[ANG2], 3[ANG3], 4[ANG4], 5[ANG5], 6[ANG6] degrees',
                        description: 'Control Angle of All Modules'
                    }),
                    arguments: {                        
                        ANG1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG3: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG4: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG5: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG6: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },                  
                {
                    opcode: 'control_go_home',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.gohomeposition',
                        default: 'return to home position of all modules',
                        description: 'All Modules Return to Home Position'
                    }),
                    arguments: {    
                    }
                }, 
                {
                    opcode: 'set_home_position',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.sethomeposition',
                        default: 'set current angle of module [SV] as 90 degrees',
                        description: 'Set Current Angle of a Module as 90 degrees'
                    }),
                    arguments: {  
                        SV: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: 'servo_no'
                        },
                    }
                },
                {
                    opcode: 'factory_reset',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.factoryreset',
                        default: 'factory reset of all settings',
                        description: 'Reset to Factory Settings'
                    }),
                    arguments: {    
                    }
                }, 
                {
                    opcode: 'remote_control_speed',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.remotecontrolspeed',
                        default: 'set remote module speed to [SPD]',
                        description: 'Set Control Speed of Remote Module'
                    }),
                    arguments: {
                        SPD: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: 'speed_no'
                        },
                    }
                },   
                {
                    opcode: 'remote_control_angle',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.remoteservoangle',
                        default: 'remote module [SV] to [ANG] degrees',
                        description: 'Control Angle of Remote Module'
                    }),
                    arguments: {
                        SV: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: 'servo_no'
                        },
                        ANG: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },      
                {
                    opcode: 'remote_control_angle',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.remoteservoangle',
                        default: 'remote module [SV] to [ANG] degrees',
                        description: 'Control Angle of Remote Module'
                    }),
                    arguments: {
                        SV: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '1',
                        },
                        ANG: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },   
                {
                    opcode: 'remote_control_angle_123',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.remoteservoangle123',
                        default: 'remote modules 1[ANG1], 2[ANG2], 3[ANG3] degrees',
                        description: 'Control Angle of Remote Module 1,2,3'
                    }),
                    arguments: {                        
                        ANG1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG3: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },  
                {
                    opcode: 'remote_control_angle_1234',
                    blockType: BlockType.COMMAND,
                    text: Message.remote_angle_control_1234[this.locale],
                    arguments: {                        
                        ANG1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG3: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG4: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },  
                {
                    opcode: 'remote_control_angle_56',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.remoteservoangle56',
                        default: 'remote modules 5[ANG5], 6[ANG6] degrees',
                        description: 'Control Angle of Remote Module 5,6'
                    }),
                    arguments: {  
                        ANG5: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG6: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },  
                {
                    opcode: 'remote_control_angle_123456',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.remoteservoangle123456',
                        default: 'remote modules 1[ANG1], 2[ANG2], 3[ANG3], 4[ANG4], 5[ANG5], 6[ANG6] degrees',
                        description: 'Control Angle of All Remote Modules'
                    }),
                    arguments: {                        
                        ANG1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG3: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG4: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG5: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                        ANG6: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '90',
                        },
                    }
                },                  
                {
                    opcode: 'remote_control_go_home',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.remotegohomeposition',
                        default: 'return to home position of all remote modules',
                        description: 'All Remote Modules Return to Home Position'
                    }),
                    arguments: {    
                    }
                }, 
                {
                    opcode: 'remote_device_set',
                    blockType: BlockType.COMMAND,                    
                    text: formatMessage({
                        id: 'aibot.setremotedevice',
                        default: 'set remote device',
                        description: 'Set a Remote Device'
                    }),
                    arguments: {    
                    }
                }, 
                {
                    opcode: 'aidesk_read_number',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'aibot.readaidesk',
                        default: 'read value from [FN] of AIDesk',
                        description: 'Return a value from AIDesk'
                    }),
                    arguments: {
                        FN: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: 'aidesk_read_no'
                        },
                    }
                },     
                {
                    opcode: 'aidesk_func_start',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.startaideskfunc',
                        default: 'start function [FN] of AIDesk (var1:[VAR1], var2:[VAR2], var3:[VAR3], var4:[VAR4])',
                        description: 'Start an AIDesk Function'
                    }),
                    arguments: {
                        FN: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: 'aidesk_read_no'
                        },
                        VAR1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0',
                        },
                        VAR2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0',
                        },
                        VAR3: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0',
                        },
                        VAR4: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0',
                        },
                    }
                },     
                {
                    opcode: 'aidesk_func_stop',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'aibot.stopaideskfunc',
                        default: 'stop function [FN] of AIDesk',
                        description: 'Stop an AIDesk Function'
                    }),
                    arguments: {
                        FN: {
                            type: ArgumentType.STRING,
                            defaultValue: '1',
                            menu: 'aidesk_read_no'
                        },
                    }
                },                
                
            ],            
            menus: {
                target_port: {
                    acceptReporters: true,
                    //items: ['1', '2', '3', '4' , '원격1', '원격2', '원격3', '원격4']
                    items: [ {text: "1", value: '0'}, 
                             {text: "2", value: '1'},
                             {text: "3", value: '2'}, 
                             {text: "4", value: '3'},
                             {text: formatMessage({id: 'aibot.remote1',default: 'remote1'}), value: '4'}, 
                             {text: formatMessage({id: 'aibot.remote2',default: 'remote2'}), value: '5'},
                             {text: formatMessage({id: 'aibot.remote3',default: 'remote3'}), value: '6'}, 
                             {text: formatMessage({id: 'aibot.remote4',default: 'remote4'}), value: '7'}
                           ]
                },
                port_inout: {
                    acceptReporters: true,
                    items: [ {text: formatMessage({id: 'aibot.digitalin',default: 'DigitalIn'}), value: '0'}, 
                             {text: formatMessage({id: 'aibot.digitalout',default: 'DigitalOut'}), value: '1'}, 
                             {text: formatMessage({id: 'aibot.analogin',default: 'AnalogIn'}), value: '2'}
                           ]
                },
                on_off: {
                    acceptReporters: true,
                    items: [ {text: formatMessage({id: 'aibot.digitalon',default: 'On'}), value: '1'}, 
                             {text: formatMessage({id: 'aibot.digitaloff',default: 'Off'}), value: '0'}
                           ]
                },
                melody_no: {
                    acceptReporters: true,
                    items: ['1', '2', '3', '4' , '5']
                },
                speed_no: {
                    acceptReporters: true,
                    items: ['1', '2', '3', '4' , '5']
                },
                servo_no: {
                    acceptReporters: true,
                    items: ['1', '2', '3', '4' , '5' , '6']
                },
                aidesk_read_no: {
                    acceptReporters: true,
                    items: ['1', '2', '3', '4' , '5']
                },
            }
        };
    }
    analog_read(args) {
        let pin = args['PORT'];
        let idx = parseInt(pin, 10);
        if (pin == 0) idx = 4;
        else if (pin == 1) idx = 5;
        else if (pin == 2) idx = 6;
        else if (pin == 3) idx = 7;
        else if (pin == 4) idx = 12;
        else if (pin == 5) idx = 13;
        else if (pin == 6) idx = 14;
        else if (pin == 7) idx = 15;
        let v = this._peripheral.sensorData.SENSOR[idx];
        return v;
    }
    digital_read(args) {
        let pin = args['PORT'];
        let idx = parseInt(pin, 10);
        if (pin == 0) idx = 0;
        else if (pin == 1) idx = 1;
        else if (pin == 2) idx = 2;
        else if (pin == 3) idx = 3;
        else if (pin == 4) idx = 8;
        else if (pin == 5) idx = 9;
        else if (pin == 6) idx = 10;
        else if (pin == 7) idx = 11;
        let v = this._peripheral.sensorData.SENSOR[idx];
        if (v == 0) v = 0;
        else v = 1;
        return v;
    }
    port_setting(args){
        let pin = args['PORT'];
        let set = parseInt(args['SET'], 10);
        let remote = 1;

        let port = parseInt(pin, 10);
        if (port >= 4) {
            remote = 2;
            port = port - 4;
        }
        this._peripheral.port_setting(remote,port,set);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    port_digital_out(args){
        let pin = args['PORT'];
        let set = parseInt(args['SET'], 10);
        let remote = 1;

        let port = parseInt(pin, 10);
        if (port >= 4) {
            remote = 2;
            port = port - 4;
        }
        this._peripheral.port_digital_out(remote,port,set);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    buzzer_melody(args){
        let melody = parseInt(args['MEL'], 10);
        let remote = 1;
        melody = melody - 1;
        this._peripheral.buzzer_melody(remote,melody);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    control_speed(args){
        let speed = parseInt(args['SPD'], 10);
        let remote = 1;
        this._peripheral.control_speed(remote,speed);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    control_angle(args,script){
        let sv = parseInt(args['SV'], 10);
        let Angle = parseFloat(args['ANG'], 10);
        let remote = 1;
        let sv1=0,sv2=0,sv3=0,sv4=0,sv5=0,sv6=0;
        if(Angle<0)Angle = 0;if(Angle>180)Angle = 180;Angle = Angle*10 + 700;
        if(sv==1)sv1 = Angle;
        else if(sv==2)sv2 = Angle;
        else if(sv==3)sv3 = Angle;
        else if(sv==4)sv4 = Angle;
        else if(sv==5)sv5 = Angle;
        else if(sv==6)sv6 = Angle; 
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);  
        //
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });              
    }
    control_angle_123(args){
        let sv1 = parseFloat(args['ANG1'], 10);
        let sv2 = parseFloat(args['ANG2'], 10);
        let sv3 = parseFloat(args['ANG3'], 10);
        let remote = 1;
        let sv4=0,sv5=0,sv6=0;

        if(sv1<0)sv1 = 0;if(sv1>180)sv1 = 180;sv1 = sv1*10 + 700;  
        if(sv2<0)sv2 = 0;if(sv2>180)sv2 = 180;sv2 = sv2*10 + 700;  
        if(sv3<0)sv3 = 0;if(sv3>180)sv3 = 180;sv3 = sv3*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    control_angle_1234(args){
        let sv1 = parseFloat(args['ANG1'], 10);
        let sv2 = parseFloat(args['ANG2'], 10);
        let sv3 = parseFloat(args['ANG3'], 10);
        let sv4 = parseFloat(args['ANG4'], 10);
        let remote = 1;
        let sv5=0,sv6=0;

        if(sv1<0)sv1 = 0;if(sv1>180)sv1 = 180;sv1 = sv1*10 + 700;  
        if(sv2<0)sv2 = 0;if(sv2>180)sv2 = 180;sv2 = sv2*10 + 700;  
        if(sv3<0)sv3 = 0;if(sv3>180)sv3 = 180;sv3 = sv3*10 + 700;
        if(sv4<0)sv4 = 0;if(sv4>180)sv4 = 180;sv4 = sv4*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    control_angle_56(args){
        let sv5 = parseFloat(args['ANG5'], 10);
        let sv6 = parseFloat(args['ANG6'], 10);
        let remote = 1;
        let sv1=0,sv2=0,sv3=0,sv4=0;

        if(sv5<0)sv5 = 0;if(sv5>180)sv5 = 180;sv5 = sv5*10 + 700;  
        if(sv6<0)sv6 = 0;if(sv6>180)sv6 = 180;sv6 = sv6*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    control_angle_123456(args){
        let sv1 = parseFloat(args['ANG1'], 10);
        let sv2 = parseFloat(args['ANG2'], 10);
        let sv3 = parseFloat(args['ANG3'], 10);
        let sv4 = parseFloat(args['ANG4'], 10);
        let sv5 = parseFloat(args['ANG5'], 10);
        let sv6 = parseFloat(args['ANG6'], 10);
        let remote = 1;

        if(sv1<0)sv1 = 0;if(sv1>180)sv1 = 180;sv1 = sv1*10 + 700;  
        if(sv2<0)sv2 = 0;if(sv2>180)sv2 = 180;sv2 = sv2*10 + 700;  
        if(sv3<0)sv3 = 0;if(sv3>180)sv3 = 180;sv3 = sv3*10 + 700;
        if(sv4<0)sv4 = 0;if(sv4>180)sv4 = 180;sv4 = sv4*10 + 700;
        if(sv5<0)sv5 = 0;if(sv5>180)sv5 = 180;sv5 = sv5*10 + 700;  
        if(sv6<0)sv6 = 0;if(sv6>180)sv6 = 180;sv6 = sv6*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    control_go_home(args){
        let remote = 1;
        this._peripheral.control_go_home(remote);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    factory_reset(args){
        let remote = 2;
        this._peripheral.factory_reset(remote);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    set_home_position(args){
        let sv = parseInt(args['SV'], 10);
        let remote = 4;
        let sv1=0,sv2=0,sv3=0,sv4=0,sv5=0,sv6=0;
        if(sv==1)sv1 = 1;
        else if(sv==2)sv2 = 1;
        else if(sv==3)sv3 = 1;
        else if(sv==4)sv4 = 1;
        else if(sv==5)sv5 = 1;
        else if(sv==6)sv6 = 1; 
        this._peripheral.set_home_position(remote,sv1,sv2,sv3,sv4,sv5,sv6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    remote_control_speed(args){
        let speed = parseInt(args['SPD'], 10);
        let remote = 2;
        this._peripheral.control_speed(remote,speed);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    remote_control_angle(args){
        let sv = parseInt(args['SV'], 10);
        let Angle = parseFloat(args['ANG'], 10);
        let remote = 2;
        let sv1=0,sv2=0,sv3=0,sv4=0,sv5=0,sv6=0;
        if(Angle<0)Angle = 0;if(Angle>180)Angle = 180;Angle = Angle*10 + 700;
        if(sv==1)sv1 = Angle;
        else if(sv==2)sv2 = Angle;
        else if(sv==3)sv3 = Angle;
        else if(sv==4)sv4 = Angle;
        else if(sv==5)sv5 = Angle;
        else if(sv==6)sv6 = Angle; 
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    remote_control_angle_123(args){
        let sv1 = parseFloat(args['ANG1'], 10);
        let sv2 = parseFloat(args['ANG2'], 10);
        let sv3 = parseFloat(args['ANG3'], 10);
        let remote = 2;
        let sv4=0,sv5=0,sv6=0;

        if(sv1<0)sv1 = 0;if(sv1>180)sv1 = 180;sv1 = sv1*10 + 700;  
        if(sv2<0)sv2 = 0;if(sv2>180)sv2 = 180;sv2 = sv2*10 + 700;  
        if(sv3<0)sv3 = 0;if(sv3>180)sv3 = 180;sv3 = sv3*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    remote_control_angle_1234(args){
        let sv1 = parseFloat(args['ANG1'], 10);
        let sv2 = parseFloat(args['ANG2'], 10);
        let sv3 = parseFloat(args['ANG3'], 10);
        let sv4 = parseFloat(args['ANG4'], 10);
        let remote = 2;
        let sv5=0,sv6=0;

        if(sv1<0)sv1 = 0;if(sv1>180)sv1 = 180;sv1 = sv1*10 + 700;  
        if(sv2<0)sv2 = 0;if(sv2>180)sv2 = 180;sv2 = sv2*10 + 700;  
        if(sv3<0)sv3 = 0;if(sv3>180)sv3 = 180;sv3 = sv3*10 + 700;
        if(sv4<0)sv4 = 0;if(sv4>180)sv4 = 180;sv4 = sv4*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    remote_control_angle_56(args){
        let sv5 = parseFloat(args['ANG5'], 10);
        let sv6 = parseFloat(args['ANG6'], 10);
        let remote = 2;
        let sv1=0,sv2=0,sv3=0,sv4=0;

        if(sv5<0)sv5 = 0;if(sv5>180)sv5 = 180;sv5 = sv5*10 + 700;  
        if(sv6<0)sv6 = 0;if(sv6>180)sv6 = 180;sv6 = sv6*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    remote_control_angle_123456(args){
        let sv1 = parseFloat(args['ANG1'], 10);
        let sv2 = parseFloat(args['ANG2'], 10);
        let sv3 = parseFloat(args['ANG3'], 10);
        let sv4 = parseFloat(args['ANG4'], 10);
        let sv5 = parseFloat(args['ANG5'], 10);
        let sv6 = parseFloat(args['ANG6'], 10);
        let remote = 2;

        if(sv1<0)sv1 = 0;if(sv1>180)sv1 = 180;sv1 = sv1*10 + 700;  
        if(sv2<0)sv2 = 0;if(sv2>180)sv2 = 180;sv2 = sv2*10 + 700;  
        if(sv3<0)sv3 = 0;if(sv3>180)sv3 = 180;sv3 = sv3*10 + 700;
        if(sv4<0)sv4 = 0;if(sv4>180)sv4 = 180;sv4 = sv4*10 + 700;
        if(sv5<0)sv5 = 0;if(sv5>180)sv5 = 180;sv5 = sv5*10 + 700;  
        if(sv6<0)sv6 = 0;if(sv6>180)sv6 = 180;sv6 = sv6*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    remote_control_go_home(args){
        let remote = 2;
        this._peripheral.control_go_home(remote);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    remote_device_set(args){
        let remote = 2;
        this._peripheral.remote_device_set(remote,1,1,1);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    aidesk_read_number(args){
        let fn = parseInt(args['FN'], 10);
        let v = this._peripheral.sensorData.AIDESK[fn-1];
        return v;
    }
    aidesk_func_start(args){
        let func=parseInt(args['FN'], 10);
        let Var1=parseInt(args['VAR1'], 10);
        let Var2=parseInt(args['VAR2'], 10);
        let Var3=parseInt(args['VAR3'], 10);
        let Var4=parseInt(args['VAR4'], 10);

        if(Var1>2000)Var1=2000;
        if(Var1<-2000)Var1=-2000;
        if(Var2>2000)Var2=2000;
        if(Var2<-2000)Var2=-2000;
        if(Var3>2000)Var3=2000;
        if(Var3<-2000)Var3=-2000;
        if(Var4>2000)Var4=2000;
        if(Var4<-2000)Var4=-2000;
        let remote = 1;
        this._peripheral.aidesk_func(remote,func,Var1,Var2,Var3,Var4);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    aidesk_func_stop(args){
        let func=parseInt(args['FN'], 10);
        let remote = 2;
        this._peripheral.aidesk_func(remote,func,0,0,0,0);

        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, SRSendInterval);
        });    
    }
    

    // end of block handlers

    _setLocale () {
        let now_locale = '';
        switch (formatMessage.setup().locale) {
            case 'ko':
                now_locale = 'ko';
                break;
            case 'pt-br':
            case 'pt':
                now_locale='pt-br';
                break;
            case 'en':
                now_locale='en';
                break;
            case 'fr':
                now_locale='fr';
                break;
            case 'zh-tw':
                now_locale= 'zh-tw';
                break;
            case 'zh-cn':
                now_locale= 'zh-cn';
                break;
            default:
                now_locale='en';
                break;
        }
        return now_locale;
    }
}

module.exports = Scratch3aibotSR;
