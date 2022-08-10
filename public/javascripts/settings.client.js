/// <reference path="./jquery-3.6.0.min.js" />

/* Server restart confirmation */
$( 'input#_actionRestart' ).on('click', function(ev) {
  if(!window.confirm('Are you sure you want to restart the server? Updates will be saved & undo queue will be lost.')) {
    ev.preventDefault();
  }
});

