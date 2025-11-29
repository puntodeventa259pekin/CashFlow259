module.exports = {
  apps: [
    {
      name: "cashflow-pro",
      // En Windows con PM2, a menudo es mejor ejecutar npm directamente
      script: "npm",
      // Los argumentos para el script (ejecuta 'npm start')
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        // Asegúrate de tener tu API KEY configurada en las variables de entorno de tu sistema
        // o descomenta la línea de abajo y ponla aquí (no recomendado para producción real)
        // API_KEY: "TU_API_KEY_AQUI" 
      },
      env_production: {
        NODE_ENV: "production",
      }
    }
  ]
};