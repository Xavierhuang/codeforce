module.exports = {
  apps: [{
    name: 'codeforce',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/codeforce',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}


