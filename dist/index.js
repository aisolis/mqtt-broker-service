"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mqtt_1 = __importDefault(require("mqtt"));
const express_1 = __importDefault(require("express"));
const redis_1 = require("@upstash/redis");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const client = mqtt_1.default.connect('mqtt://broker.hivemq.com');
const redis = new redis_1.Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});
const DEVICE_STATE_KEY = 'device:state';
const getDeviceState = async () => {
    try {
        const state = await redis.hgetall(DEVICE_STATE_KEY);
        if (!state || Object.keys(state).length === 0) {
            return {
                isLocked: false,
                hasPower: true,
                lastUpdate: new Date().toISOString()
            };
        }
        return {
            isLocked: state.isLocked === 'true' || state.isLocked === true,
            hasPower: state.hasPower === 'true' || state.hasPower === true,
            lastUpdate: state.lastUpdate || new Date().toISOString(),
            lastCommand: state.lastCommand
        };
    }
    catch (error) {
        console.error('Error getting device state:', error);
        return {
            isLocked: false,
            hasPower: true,
            lastUpdate: new Date().toISOString()
        };
    }
};
const saveDeviceState = async (state) => {
    try {
        const currentState = await getDeviceState();
        const newState = {
            ...currentState,
            ...state,
            lastUpdate: new Date().toISOString()
        };
        await redis.hset(DEVICE_STATE_KEY, newState);
    }
    catch (error) {
        console.error('Error saving device state:', error);
    }
};
client.on('connect', () => {
    console.log('Conectado a MQTT');
    client.subscribe('device/resp');
});
client.on('message', async (topic, message) => {
    const messageStr = message.toString();
    console.log('Arduino:', messageStr);
    if (topic === 'device/resp') {
        try {
            const response = JSON.parse(messageStr);
            if (response.status === 'locked') {
                await saveDeviceState({ isLocked: true });
            }
            else if (response.status === 'unlocked') {
                await saveDeviceState({ isLocked: false });
            }
            else if (response.power !== undefined) {
                await saveDeviceState({ hasPower: response.power });
            }
        }
        catch (error) {
            console.log('Response no es JSON válido:', messageStr);
        }
    }
});
app.post('/device/command', async (req, res) => {
    const { command } = req.body;
    const validCommands = ['lock', 'unlock', 'disconnect', 'reconnect'];
    if (!validCommands.includes(command)) {
        return res.status(400).json({
            error: 'Invalid command',
            valid_commands: validCommands
        });
    }
    client.publish('device/cmd', command);
    await saveDeviceState({
        lastCommand: command,
        ...(command === 'lock' && { isLocked: true }),
        ...(command === 'unlock' && { isLocked: false }),
        ...(command === 'disconnect' && { hasPower: false }),
        ...(command === 'reconnect' && { hasPower: true })
    });
    res.json({
        status: 'sent',
        command: command
    });
});
app.get('/device/status', async (req, res) => {
    try {
        const state = await getDeviceState();
        res.json(state);
    }
    catch (error) {
        console.error('Error getting device status:', error);
        res.status(500).json({
            error: 'Failed to get device status'
        });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Microservicio en puerto ${PORT}`);
});
