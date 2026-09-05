import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId;
    if (userId) {
      client.join(`user:${userId}`);
      const sockets = this.userSockets.get(userId) ?? new Set();
      sockets.add(client.id);
      this.userSockets.set(userId, sockets);
      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      sockets?.delete(client.id);
      if (sockets?.size === 0) this.userSockets.delete(userId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { time: new Date().toISOString() });
  }

  notifyUser(userId: string, event: string, payload: any) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  notifyAll(event: string, payload: any) {
    this.server.emit(event, payload);
  }

  broadcastAssignmentChange(assignmentId: string, status: string, affectedUserIds: string[]) {
    for (const userId of affectedUserIds) {
      this.notifyUser(userId, 'assignment:changed', { assignmentId, status });
    }
    this.notifyAll('board:refresh', { assignmentId, status });
  }
}
