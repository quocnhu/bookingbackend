import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    private userSockets;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handlePing(client: Socket): void;
    notifyUser(userId: string, event: string, payload: any): void;
    notifyAll(event: string, payload: any): void;
    broadcastAssignmentChange(assignmentId: string, status: string, affectedUserIds: string[]): void;
}
