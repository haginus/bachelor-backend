import { Response } from "express";

export class ServerSentEventsHandler {
  constructor(private response: Response) {
    this.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    this.response.on('close', () => {
      this.close();
    });
    this.emit('connected', 'Connected to server.');
  }

  private emit(event: string, data: string | object, id?: string) {
    const stringifiedData = typeof data === 'string' ? data : JSON.stringify(data);
    this.response.write(`event: ${event}\ndata: ${stringifiedData}\n`);
    if(id) this.response.write(`id: ${id}\n`);
    this.response.write('\n');
  }

  emitMessage(data: string | object, id?: string) {
    this.emit('message', data, id);
  }

  emitError(data: string | object, id?: string) {
    this.emit('error', data, id);
  }

  close() {
    this.emit('disconnected', 'Disconnected from server.');
    this.response.end();
  }

}