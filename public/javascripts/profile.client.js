/// <reference path="./jquery-3.6.0.min.js" />

/* Table reset confirmation */
$( 'input#actionRemove' ).on('click', function(ev) {
  if(!window.confirm('WARNING! This will delete your login credentials and log you out, are you sure you want to do this?')) {
    ev.preventDefault();
  }
});

/* Update password/confirm fields on each change */
$( 'input#confirm, input#password' ).on('input', function() {
  var confirm = $( 'input#confirm' );
  var confirmVal = confirm.val();
  var pwordVal = $( 'input#password' ).val();

  confirm.attr('required', !!pwordVal);
  
  if (!confirmVal || confirmVal === pwordVal) {
    return confirm.removeClass('invalid');
  }
  confirm.addClass('invalid');
});
