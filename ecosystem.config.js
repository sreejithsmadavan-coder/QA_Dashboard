module.exports = {
  apps: [
    {
      name: 'qa-backend',
      cwd: './backend',
      script: 'server.js',
      watch: ['server.js', 'routes', 'controllers', 'models', 'middleware', 'socket', 'utils', 'config'],
      ignore_watch: ['node_modules', 'uploads', '*.db', '*.db-journal'],
      env: { NODE_ENV: 'development' },
      restart_delay: 1000,
      max_restarts: 10,
    },
    {
      name: 'qa-frontend',
      cwd: './frontend',
      script: './node_modules/vite/bin/vite.js',
      args: '--host --force',
      watch: false,
      env: { NODE_ENV: 'development' },
      restart_delay: 1000,
      max_restarts: 10,
    },
  ],
};
