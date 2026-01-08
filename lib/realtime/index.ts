// Store for connected SSE clients - in production, use Redis or similar
const clients = new Set<ReadableStreamDefaultController>();

// Event emitter for sensor updates
export const sensorUpdateEmitter = {
  emit: (data: unknown) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach((controller) => {
      try {
        controller.enqueue(new TextEncoder().encode(message));
      } catch {
        clients.delete(controller);
      }
    });
  },
};

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
}

export function getClientsCount() {
  return clients.size;
}
