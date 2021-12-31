  

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
const BTSendRateMax = 20;



// flag to indicate if the user connected to a board

// common

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
            if(this.rcvCount > 1){
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
            //blockIconURI: 'data:image/png;base64,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',
            blocks: [ 
                {
                    opcode: 'analog_read',
                    blockType: BlockType.REPORTER,
                    //text: FormDigitalRead[the_locale],
                    text: '아날로그 [PORT]번 입력값',
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
                    text: '디지털 [PORT]번 입력값',
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
                    text: '입출력 [PORT]번을 [SET](으)로 설정',
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
                    text: '디지털출력 [PORT]번 [SET]',
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
                    text: '부저 [MEL]번 효과음 재생',
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
                    text: '제어속도를 [SPD](으)로 정하기',
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
                    text: '모듈 [SV](을)를 [ANG]각도로 제어',
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
                    opcode: 'control_angle_123',
                    blockType: BlockType.COMMAND,
                    text: '모듈 1[ANG1], 2[ANG2], 3[ANG3] 각도로 제어',
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
                    opcode: 'control_angle_56',
                    blockType: BlockType.COMMAND,
                    text: '모듈 5[ANG5], 6[ANG6] 각도로 제어',
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
                    text: '모듈 1[ANG1], 2[ANG2], 3[ANG3], 4[ANG4], 5[ANG5], 6[ANG6] 각도로 제어',
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
                    text: '모든 모듈을 기본위치로 제어하기(원점복귀)',
                    arguments: {    
                    }
                }, 
                {
                    opcode: 'set_home_position',
                    blockType: BlockType.COMMAND,
                    text: '[SV]번 모듈의 90도 위치를 현재의 위치로 정하기',
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
                    text: '모든 설정값 공장초기화',
                    arguments: {    
                    }
                }, 
                {
                    opcode: 'remote_control_speed',
                    blockType: BlockType.COMMAND,
                    text: '원격의 제어속도를 [SPD](으)로 정하기',
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
                    text: '원격모듈 [SV](을)를 [ANG]각도로 제어',
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
                    opcode: 'remote_control_angle_123',
                    blockType: BlockType.COMMAND,
                    text: '원격모듈 1[ANG1], 2[ANG2], 3[ANG3] 각도로 제어',
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
                    opcode: 'remote_control_angle_56',
                    blockType: BlockType.COMMAND,
                    text: '원격모듈 5[ANG5], 6[ANG6] 각도로 제어',
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
                    text: '원격모듈 1[ANG1], 2[ANG2], 3[ANG3], 4[ANG4], 5[ANG5], 6[ANG6] 각도로 제어',
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
                    text: '원격모듈 모듈을 기본위치로 제어하기(원점복귀)',
                    arguments: {    
                    }
                }, 
                {
                    opcode: 'remote_device_set',
                    blockType: BlockType.COMMAND,
                    text: '원격 디바이스 설정',
                    arguments: {    
                    }
                }, 
                {
                    opcode: 'aidesk_read_number',
                    blockType: BlockType.REPORTER,
                    text: 'AI Desk의 [FN]번 값',
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
                    blockType: BlockType.REPORTER,
                    //text: FormDigitalRead[the_locale],
                    text: 'AI Desk의 [FN]번 기능 시작하기(변수1:[VAR1], 변수2:[VAR2], 변수3:[VAR3], 변수4:[VAR4])',
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
                    blockType: BlockType.REPORTER,
                    //text: FormDigitalRead[the_locale],
                    text: 'AI Desk의 [FN]번 기능 정지하기',
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
                             {text: "원격1", value: '4'}, 
                             {text: "원격2", value: '5'},
                             {text: "원격3", value: '6'}, 
                             {text: "원격4", value: '7'}
                           ]
                },
                port_inout: {
                    acceptReporters: true,
                    items: [ {text: "디지털입력", value: '0'}, 
                             {text: "디지털출력", value: '1'}, 
                             {text: "아날로그입력", value: '2'}
                           ]
                },
                on_off: {
                    acceptReporters: true,
                    items: [ {text: "켜기", value: '1'}, 
                             {text: "끄기", value: '0'}
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
    }
    buzzer_melody(args){
        let melody = parseInt(args['MEL'], 10);
        let remote = 1;
        melody = melody - 1;
        this._peripheral.buzzer_melody(remote,melody);
    }
    control_speed(args){
        let speed = parseInt(args['SPD'], 10);
        let remote = 1;
        this._peripheral.control_speed(remote,speed);
    }
    control_angle(args){
        let sv = parseInt(args['SV'], 10);
        let Angle = parseInt(args['ANG'], 10);
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
    }
    control_angle_123(args){
        let sv1 = parseInt(args['ANG1'], 10);
        let sv2 = parseInt(args['ANG2'], 10);
        let sv3 = parseInt(args['ANG3'], 10);
        let remote = 1;
        let sv4=0,sv5=0,sv6=0;

        if(sv1<0)sv1 = 0;if(sv1>180)sv1 = 180;sv1 = sv1*10 + 700;  
        if(sv2<0)sv2 = 0;if(sv2>180)sv2 = 180;sv2 = sv2*10 + 700;  
        if(sv3<0)sv3 = 0;if(sv3>180)sv3 = 180;sv3 = sv3*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);
    }
    control_angle_56(args){
        let sv5 = parseInt(args['ANG5'], 10);
        let sv6 = parseInt(args['ANG6'], 10);
        let remote = 1;
        let sv1=0,sv2=0,sv3=0,sv4=0;

        if(sv5<0)sv5 = 0;if(sv5>180)sv5 = 180;sv5 = sv5*10 + 700;  
        if(sv6<0)sv6 = 0;if(sv6>180)sv6 = 180;sv6 = sv6*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);
    }
    control_angle_123456(args){
        let sv1 = parseInt(args['ANG1'], 10);
        let sv2 = parseInt(args['ANG2'], 10);
        let sv3 = parseInt(args['ANG3'], 10);
        let sv4 = parseInt(args['ANG4'], 10);
        let sv5 = parseInt(args['ANG5'], 10);
        let sv6 = parseInt(args['ANG6'], 10);
        let remote = 1;

        if(sv1<0)sv1 = 0;if(sv1>180)sv1 = 180;sv1 = sv1*10 + 700;  
        if(sv2<0)sv2 = 0;if(sv2>180)sv2 = 180;sv2 = sv2*10 + 700;  
        if(sv3<0)sv3 = 0;if(sv3>180)sv3 = 180;sv3 = sv3*10 + 700;
        if(sv5<0)sv5 = 0;if(sv5>180)sv5 = 180;sv5 = sv5*10 + 700;  
        if(sv6<0)sv6 = 0;if(sv6>180)sv6 = 180;sv6 = sv6*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);
    }
    control_go_home(args){
        let remote = 1;
        this._peripheral.control_go_home(remote);
    }
    factory_reset(args){
        let remote = 2;
        this._peripheral.factory_reset(remote);
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
    }
    remote_control_speed(args){
        let speed = parseInt(args['SPD'], 10);
        let remote = 2;
        this._peripheral.control_speed(remote,speed);
    }
    remote_control_angle(args){
        let sv = parseInt(args['SV'], 10);
        let Angle = parseInt(args['ANG'], 10);
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
    }
    remote_control_angle_123(args){
        let sv1 = parseInt(args['ANG1'], 10);
        let sv2 = parseInt(args['ANG2'], 10);
        let sv3 = parseInt(args['ANG3'], 10);
        let remote = 2;
        let sv4=0,sv5=0,sv6=0;

        if(sv1<0)sv1 = 0;if(sv1>180)sv1 = 180;sv1 = sv1*10 + 700;  
        if(sv2<0)sv2 = 0;if(sv2>180)sv2 = 180;sv2 = sv2*10 + 700;  
        if(sv3<0)sv3 = 0;if(sv3>180)sv3 = 180;sv3 = sv3*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);
    }
    remote_control_angle_56(args){
        let sv5 = parseInt(args['ANG5'], 10);
        let sv6 = parseInt(args['ANG6'], 10);
        let remote = 2;
        let sv1=0,sv2=0,sv3=0,sv4=0;

        if(sv5<0)sv5 = 0;if(sv5>180)sv5 = 180;sv5 = sv5*10 + 700;  
        if(sv6<0)sv6 = 0;if(sv6>180)sv6 = 180;sv6 = sv6*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);
    }
    remote_control_angle_123456(args){
        let sv1 = parseInt(args['ANG1'], 10);
        let sv2 = parseInt(args['ANG2'], 10);
        let sv3 = parseInt(args['ANG3'], 10);
        let sv4 = parseInt(args['ANG4'], 10);
        let sv5 = parseInt(args['ANG5'], 10);
        let sv6 = parseInt(args['ANG6'], 10);
        let remote = 2;

        if(sv1<0)sv1 = 0;if(sv1>180)sv1 = 180;sv1 = sv1*10 + 700;  
        if(sv2<0)sv2 = 0;if(sv2>180)sv2 = 180;sv2 = sv2*10 + 700;  
        if(sv3<0)sv3 = 0;if(sv3>180)sv3 = 180;sv3 = sv3*10 + 700;
        if(sv5<0)sv5 = 0;if(sv5>180)sv5 = 180;sv5 = sv5*10 + 700;  
        if(sv6<0)sv6 = 0;if(sv6>180)sv6 = 180;sv6 = sv6*10 + 700;
        this._peripheral.control_angle(remote,sv1,sv2,sv3,sv4,sv5,sv6);
    }
    remote_control_go_home(args){
        let remote = 2;
        this._peripheral.control_go_home(remote);
    }
    remote_device_set(args){
        let remote = 2;
        this._peripheral.remote_device_set(remote,1,1,1);
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
    }
    aidesk_func_stop(args){
        let func=parseInt(args['FN'], 10);
        let remote = 2;
        this._peripheral.aidesk_func(remote,func,0,0,0,0);
    }
    

    // end of block handlers

    _setLocale () {
        let now_locale = '';
        switch (formatMessage.setup().locale) {
            case 'kr':
                now_locale = 'kr';
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
