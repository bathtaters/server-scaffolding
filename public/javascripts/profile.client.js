/// <reference path="./jquery-3.6.0.min.js" />

/* Table reset confirmation */
$( 'input#_actionRemove' ).on('click', function(ev) {
  if(!window.confirm('WARNING! This will delete your login credentials and log you out, are you sure you want to do this?')) {
    ev.preventDefault();
  }
});

/* Copy API Key to Clipboard (Hide if no Clipboard API) */
$( function() { if (!navigator.clipboard) { $( '#copyToken' ).addClass('hidden'); } } );
$( '#copyToken' ).on('click', function() {
  if (!navigator.clipboard) { return window.alert('Browser does not support copying to clipboard'); }
  
  var token = $( '#token' ).text();
  if (!token) { return; }

  navigator.clipboard.writeText(token).then(
    function() { window.alert('API Key copied to clipboard'); }, 
    function() { window.alert('Error or browser does not support copying to clipboard'); }
  );
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


/* Token regen confirmation */
$( 'input#regenToken' ).on('click', function(ev) {
  if(!window.confirm('WARNING! This will block any API requests using your old token, are you sure you want to do this?')) {
    return ev.preventDefault();
  }

  var idElem = $( '#primary-key input' );
  var idVal = idElem.val();
  if (!idVal) return window.alert('Select a row to update...');

  var sendData = {};
  sendData[idElem.attr('id')] = idVal;
  sendData['_csrf'] = $( '#_csrf' ).val();

  $.ajax({
    type:    "POST",
    url:     $(this).attr('formaction'),
    data:    sendData,
    success: function(data) {
        if (!data.success) { window.alert('Error regenerating API ID: '+((data.error && data.error.message) || data.error || 'Unknown error')); }
        else { window.location.reload(); }
      },
    error:   function(jqXHR, textStatus, errorThrown) {
        window.alert("Error regenerating API ID!\n" + (
          (jqXHR.responseJSON && jqXHR.responseJSON.error && 
            (jqXHR.responseJSON.error.message || jqXHR.responseJSON.error)
          ) || errorThrown + " [" + textStatus + "]"
        ));
    }
  });
});