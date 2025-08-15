import mqtt from 'mqtt';
import express, { Request, Response } from 'express';
import { kv } from '@vercel/kv';

const app = express();
app.use(express.json());

const client = mqtt.connect('mqtt://broker.hivemq.com');

interface DeviceState {
  isLocked: boolean;
  hasPower: boolean;
  lastUpdate: string;
  lastCommand?: string;
}

interface CommandRequest {
  command: string;
}

interface CommandResponse {
  status: string;
  command: string;
}

interface ErrorResponse {
  error: string;
  valid_commands: string[];
}

const DEVICE_STATE_KEY = 'device:state';

const getDeviceState = async (): Promise<DeviceState> => {
  try {
    const state = await kv.hgetall(DEVICE_STATE_KEY) as DeviceState;
    if (!state || Object.keys(state).length === 0) {
      return {
        isLocked: false,
        hasPower: true,
        lastUpdate: new Date().toISOString()
      };
    }
    return state;
  } catch (error) {
    console.error('Error getting device state:', error);
    return {
      isLocked: false,
      hasPower: true,
      lastUpdate: new Date().toISOString()
    };
  }
};

const saveDeviceState = async (state: Partial<DeviceState>): Promise<void> => {
  try {
    const currentState = await getDeviceState();
    const newState = {
      ...currentState,
      ...state,
      lastUpdate: new Date().toISOString()
    };
    await kv.hset(DEVICE_STATE_KEY, newState);
  } catch (error) {
    console.error('Error saving device state:', error);
  }
};

client.on('connect', () => {
  console.log('Conectado a MQTT');
  client.subscribe('device/resp');
});

client.on('message', async (topic: string, message: Buffer) => {
  const messageStr = message.toString();
  console.log('Arduino:', messageStr);
  
  if (topic === 'device/resp') {
    try {
      const response = JSON.parse(messageStr);
      
      if (response.status === 'locked') {
        await saveDeviceState({ isLocked: true });
      } else if (response.status === 'unlocked') {
        await saveDeviceState({ isLocked: false });
      } else if (response.power !== undefined) {
        await saveDeviceState({ hasPower: response.power });
      }
    } catch (error) {
      console.log('Response no es JSON válido:', messageStr);
    }
  }
});

app.post('/device/command', async (req: Request<{}, CommandResponse | ErrorResponse, CommandRequest>, res: Response<CommandResponse | ErrorResponse>) => {
  const { command } = req.body;
  
  const validCommands: string[] = ['lock', 'unlock', 'disconnect', 'reconnect'];
  
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

app.get('/device/status', async (req: Request, res: Response) => {
  try {
    const state = await getDeviceState();
    res.json(state);
  } catch (error) {
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