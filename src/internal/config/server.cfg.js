module.exports = {
  isCluster: false, // Cluster mode not working
  processCount: 6,
  
  gracefulExitOptions: {
    suicideTimeout: 4000,
    log: true,
    logger: 'verbose',
    performLastRequest: true,
    errorDuringExit: true,
  },
}