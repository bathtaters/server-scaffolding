module.exports = {
  isCluster: false, // Cluster mode not working
  processCount: 6,
  trustProxy: process.env.NODE_ENV === 'production' && ['loopback'], // for using behind NGINX
  isSecure: process.env.NODE_ENV !== 'test' && (process.env.NODE_ENV === 'production' ? true : true), // enable SSL/TLD
  
  gracefulExitOptions: {
    suicideTimeout: 4000,
    log: true,
    logger: 'verbose',
    performLastRequest: true,
    errorDuringExit: true,
  },
}