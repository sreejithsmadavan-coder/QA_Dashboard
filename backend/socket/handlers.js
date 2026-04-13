const connectedUsers = new Map();

function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join', ({ userId, projectId }) => {
      if (userId) {
        connectedUsers.set(socket.id, userId);
        socket.join(`user:${userId}`);
      }
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on('join_project', (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('leave_project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

// Emit to all connected clients
function broadcast(io, event, data) {
  io.emit(event, data);
}

// Emit to a specific project room
function emitToProject(io, projectId, event, data) {
  io.to(`project:${projectId}`).emit(event, data);
}

module.exports = { initSocket, broadcast, emitToProject };
