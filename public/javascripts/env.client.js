/// <reference path="./jquery-3.6.0.min.js" />

/* Server restart confirmation */
$( 'input#actionRestart' ).on('click', function(ev) {
  if($('#env').val().trim() !== $('#env').text().trim()) {
    if (!window.confirm('Are you sure you want to restart the server? Your unsaved updates and undo queue will be lost.')) {
      return ev.preventDefault();
    }
  }

  else if(!window.confirm('Are you sure you want to restart the server? Undo queue will be lost.')) {
    ev.preventDefault();
  }
});

/* .ENV update confirmation */
$( 'input#actionUpdate' ).on('click', function(ev) {
  if(!$('#env').val().trim()) {
    window.alert('Must provide .ENV settings to update (Use Default to clear settings).');
    ev.preventDefault();
  }
});
