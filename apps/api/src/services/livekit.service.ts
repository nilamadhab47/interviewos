import { AccessToken } from 'livekit-server-sdk';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';

export interface LiveKitTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  role: string; // 'interviewer' | 'candidate' | 'observer'
}

export async function generateLiveKitToken(options: LiveKitTokenOptions): Promise<string> {
  const { roomName, participantIdentity, participantName, role } = options;

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    ttl: '6h',
    metadata: JSON.stringify({ role }),
  });

  // Grant permissions based on role
  const canPublish = role !== 'observer'; // observers can only watch
  const canSubscribe = true;

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData: true,
  });

  return token.toJwt();
}
